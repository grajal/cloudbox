import { ConditionalCheckFailedException, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'node:crypto';
import { ROOT_ID } from '@cloudbox/shared';
import type { Item } from '@cloudbox/shared';
import { HttpError } from '../lib/errors.js';

/*
 * Table layout (single table "cloudbox-<env>"):
 *
 *   Item        PK = USER#<sub>                 SK = ITEM#<id>
 *   GSI1 (list) GSI1PK = USER#<sub>#PARENT#<parentId>   GSI1SK = <1|2>#<lowercased name>
 *
 * Every key starts with the user's id, taken from the verified token, so a query can only
 * ever see that user's items. GSI1SK starts with 1 for folders and 2 for files: folders sort first.
 * This file is the only place that knows these key formats.
 */

// Created outside the handler: warm invocations reuse the client (and its connections).
const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const tableName = (): string => {
  const name = process.env.TABLE_NAME;
  if (!name) throw new Error('TABLE_NAME is not set');
  return name;
};

const userPk = (sub: string) => `USER#${sub}`;
const itemSk = (id: string) => `ITEM#${id}`;
const parentKey = (sub: string, parentId: string) => `USER#${sub}#PARENT#${parentId}`;
const listSortKey = (type: Item['type'], name: string) =>
  `${type === 'FOLDER' ? '1' : '2'}#${name.toLowerCase()}`;

type ItemRecord = Item & { PK: string; SK: string; GSI1PK: string; GSI1SK: string };

/** Drops the storage keys: callers only ever see the public Item shape. */
const toItem = (r: ItemRecord): Item => ({
  id: r.id,
  type: r.type,
  name: r.name,
  parentId: r.parentId,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
});

export async function getItem(sub: string, id: string): Promise<Item | undefined> {
  const { Item: record } = await client.send(
    new GetCommand({ TableName: tableName(), Key: { PK: userPk(sub), SK: itemSk(id) } }),
  );
  return record ? toItem(record as ItemRecord) : undefined;
}

async function assertFolderExists(sub: string, parentId: string): Promise<void> {
  if (parentId === ROOT_ID) return;
  const parent = await getItem(sub, parentId);
  if (parent?.type !== 'FOLDER') throw new HttpError(404, 'Folder not found');
}

export async function createFolder(sub: string, name: string, parentId: string): Promise<Item> {
  await assertFolderExists(sub, parentId);

  const now = new Date().toISOString();
  const item: Item = {
    id: randomUUID(),
    type: 'FOLDER',
    name,
    parentId: parentId as Item['parentId'],
    createdAt: now,
    updatedAt: now,
  };

  await client.send(
    new PutCommand({
      TableName: tableName(),
      Item: {
        ...item,
        PK: userPk(sub),
        SK: itemSk(item.id),
        GSI1PK: parentKey(sub, parentId),
        GSI1SK: listSortKey(item.type, name),
      },
      ConditionExpression: 'attribute_not_exists(PK)', // never overwrite an existing item
    }),
  );
  return item;
}

/**
 * Lists a folder's children, folders first, then by name.
 * Known limit: returns the first page only (up to 1 MB of items, thousands of entries);
 * pagination arrives with file uploads.
 */
export async function listChildren(sub: string, parentId: string): Promise<Item[]> {
  await assertFolderExists(sub, parentId);

  const { Items } = await client.send(
    new QueryCommand({
      TableName: tableName(),
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: { ':pk': parentKey(sub, parentId) },
    }),
  );
  return (Items ?? []).map((r) => toItem(r as ItemRecord));
}

export async function renameItem(sub: string, id: string, name: string): Promise<Item> {
  const existing = await getItem(sub, id);
  if (!existing) throw new HttpError(404, 'Item not found');

  try {
    const { Attributes } = await client.send(
      new UpdateCommand({
        TableName: tableName(),
        Key: { PK: userPk(sub), SK: itemSk(id) },
        // "name" is a DynamoDB reserved word, so it goes through an alias (#name).
        UpdateExpression: 'SET #name = :name, updatedAt = :now, GSI1SK = :sk',
        ConditionExpression: 'attribute_exists(PK)', // fail instead of creating a new item
        ExpressionAttributeNames: { '#name': 'name' },
        ExpressionAttributeValues: {
          ':name': name,
          ':now': new Date().toISOString(),
          ':sk': listSortKey(existing.type, name),
        },
        ReturnValues: 'ALL_NEW',
      }),
    );
    return toItem(Attributes as ItemRecord);
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      throw new HttpError(404, 'Item not found');
    }
    throw error;
  }
}
