import { ConditionalCheckFailedException, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { Item, ItemType, ROOT_ID } from '@cloudbox/shared';
import { randomUUID } from 'node:crypto';
import { HttpError } from '../lib/errors.js';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const tableName = (): string => {
  const name = process.env.TABLE_NAME;

  if (!name) throw new Error('TABLE_NAME is not set');

  return name;
};

const userPk = (sub: string): string => `USER#${sub}`;
const itemSk = (id: string): string => `ITEM#${id}`;
const parentKey = (sub: string, parentId: string): string => `USER#${sub}#PARENT#${parentId}`;
const listSortKey = (type: Item['type'], name: string): string =>
  `${type === 'FOLDER' ? '1' : '2'}#${name.toLowerCase()}`;

type ItemRecord = Item & { PK: string; SK: string; GSI1PK: string; GSI1SK: string };

const toItem = (r: ItemRecord): Item => ({
  id: r.id,
  type: r.type,
  name: r.name,
  parentId: r.parentId,
  size: r.size,
  contentType: r.contentType,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
});

export async function getItem(sub: string, id: string): Promise<Item | undefined> {
  const { Item: record } = await client.send(
    new GetCommand({
      TableName: tableName(),
      Key: { PK: userPk(sub), SK: itemSk(id) },
    }),
  );
  return record ? toItem(record as ItemRecord) : undefined;
}

async function assertFolderExists(sub: string, parentId: string): Promise<void> {
  if (parentId === ROOT_ID) return;

  const item = await getItem(sub, parentId);
  if (item?.type !== ItemType.enum.FOLDER) throw new HttpError(404, 'Folder not found');
}

export async function createFolder(sub: string, name: string, parentId: string): Promise<Item> {
  await assertFolderExists(sub, parentId);

  const now = new Date().toISOString();

  const item: Item = {
    id: randomUUID(),
    parentId,
    name,
    type: ItemType.enum.FOLDER,
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
      ConditionExpression: 'attribute_not_exists(PK)',
    }),
  );

  return item;
}

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
        UpdateExpression: 'SET #name = :name, updatedAt = :now, GSI1SK = :sk',
        ConditionExpression: 'attribute_exists(PK)',
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
  } catch (e) {
    if (e instanceof ConditionalCheckFailedException) throw new HttpError(404, 'Item not found');
    throw e;
  }
}
