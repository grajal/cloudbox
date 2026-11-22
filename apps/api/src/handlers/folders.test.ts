import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { apiEvent, context } from '../testing/events.js';
import { handler as createFolder } from './createFolder.js';
import { handler as listChildren } from './listChildren.js';
import { handler as renameItem } from './renameItem.js';

const ddb = mockClient(DynamoDBDocumentClient);

const FOLDER_ID = '11111111-1111-4111-8111-111111111111';
const FILE_ID = '22222222-2222-4222-8222-222222222222';
const NOW = '2026-11-22T10:00:00.000Z';

// What is stored in the table: the public fields plus the internal keys.
const record = (id: string, type: 'FOLDER' | 'FILE', name: string, sub = 'user-a') => ({
  PK: `USER#${sub}`,
  SK: `ITEM#${id}`,
  GSI1PK: `USER#${sub}#PARENT#root`,
  GSI1SK: `${type === 'FOLDER' ? '1' : '2'}#${name.toLowerCase()}`,
  id,
  type,
  name,
  parentId: 'root',
  createdAt: NOW,
  updatedAt: NOW,
});

const bodyOf = (res: { body?: string }) => JSON.parse(res.body ?? '');

beforeEach(() => {
  ddb.reset();
  // Like the real service: reading an item that doesn't exist returns an empty result.
  ddb.on(GetCommand).resolves({});
  process.env.TABLE_NAME = 'test-table';
});

describe('POST /folders', () => {
  it('creates a folder under the caller’s own partition', async () => {
    ddb.on(PutCommand).resolves({});

    const res = await createFolder(
      apiEvent({ sub: 'user-a', body: { name: '  My Docs  ' } }),
      context,
    );

    expect(res.statusCode).toBe(201);
    expect(bodyOf(res).item).toMatchObject({ type: 'FOLDER', name: 'My Docs', parentId: 'root' });

    const put = ddb.commandCalls(PutCommand)[0]!.args[0].input;
    expect(put.TableName).toBe('test-table');
    expect(put.Item).toMatchObject({
      PK: 'USER#user-a',
      GSI1PK: 'USER#user-a#PARENT#root',
      GSI1SK: '1#my docs', // folders sort before files, names case-insensitively
    });
    expect(put.ConditionExpression).toBe('attribute_not_exists(PK)');
  });

  it('never exposes the storage keys in the response', async () => {
    ddb.on(PutCommand).resolves({});
    const res = await createFolder(apiEvent({ sub: 'user-a', body: { name: 'x' } }), context);
    expect(Object.keys(bodyOf(res).item).sort()).toEqual(
      ['createdAt', 'id', 'name', 'parentId', 'type', 'updatedAt'].sort(),
    );
  });

  it('rejects an empty name, a name with "/" and invalid JSON with 400', async () => {
    for (const event of [
      apiEvent({ sub: 'user-a', body: { name: '   ' } }),
      apiEvent({ sub: 'user-a', body: { name: 'a/b' } }),
      apiEvent({ sub: 'user-a', rawBody: '{not json' }),
    ]) {
      expect((await createFolder(event, context)).statusCode).toBe(400);
    }
    expect(ddb.commandCalls(PutCommand)).toHaveLength(0);
  });

  it('explains in plain words what is wrong with the name', async () => {
    const reasons = async (name: string) => {
      const res = await createFolder(apiEvent({ sub: 'user-a', body: { name } }), context);
      return (bodyOf(res).details as { message: string }[]).map((d) => d.message);
    };

    expect(await reasons('a/b')).toEqual(['Name cannot contain "/"']);
    expect(await reasons('   ')).toEqual(['Name cannot be empty']);
    expect(await reasons('x'.repeat(256))).toEqual(['Name must be 255 characters or fewer']);
  });

  it('answers 401 when the token has no subject', async () => {
    const res = await createFolder(apiEvent({ body: { name: 'x' } }), context);
    expect(res.statusCode).toBe(401);
    expect(ddb.calls()).toHaveLength(0);
  });

  it('answers 404 when the parent folder does not exist', async () => {
    ddb.on(GetCommand).resolves({});
    const res = await createFolder(
      apiEvent({ sub: 'user-a', body: { name: 'x', parentId: FOLDER_ID } }),
      context,
    );
    expect(res.statusCode).toBe(404);
    expect(ddb.commandCalls(PutCommand)).toHaveLength(0);
  });

  it('answers 404 when the parent is a file, not a folder', async () => {
    ddb.on(GetCommand).resolves({ Item: record(FILE_ID, 'FILE', 'photo.png') });
    const res = await createFolder(
      apiEvent({ sub: 'user-a', body: { name: 'x', parentId: FILE_ID } }),
      context,
    );
    expect(res.statusCode).toBe(404);
  });

  it('hides internal errors behind a generic 500', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    ddb.on(PutCommand).rejects(new Error('table arn:aws:dynamodb:secret exploded'));

    const res = await createFolder(apiEvent({ sub: 'user-a', body: { name: 'x' } }), context);

    expect(res.statusCode).toBe(500);
    expect(res.body).not.toContain('secret');
  });
});

describe('GET /folders/{id}/children', () => {
  it('lists the top level through the parent index', async () => {
    ddb.on(QueryCommand).resolves({
      Items: [record(FOLDER_ID, 'FOLDER', 'Docs'), record(FILE_ID, 'FILE', 'a.png')],
    });

    const res = await listChildren(
      apiEvent({ sub: 'user-a', pathParameters: { id: 'root' } }),
      context,
    );

    expect(res.statusCode).toBe(200);
    expect(bodyOf(res).items.map((i: { name: string }) => i.name)).toEqual(['Docs', 'a.png']);

    const query = ddb.commandCalls(QueryCommand)[0]!.args[0].input;
    expect(query.IndexName).toBe('GSI1');
    expect(query.ExpressionAttributeValues).toEqual({ ':pk': 'USER#user-a#PARENT#root' });
  });

  it('only ever queries the caller’s own partition', async () => {
    ddb.on(QueryCommand).resolves({ Items: [] });

    await listChildren(apiEvent({ sub: 'user-b', pathParameters: { id: 'root' } }), context);

    const values = ddb.commandCalls(QueryCommand)[0]!.args[0].input.ExpressionAttributeValues;
    expect(values?.[':pk']).toBe('USER#user-b#PARENT#root');
  });

  it('answers 404 for a folder that is not the caller’s', async () => {
    // user-a owns the folder; user-b asks for it. user-b's keys match nothing.
    ddb
      .on(GetCommand, { Key: { PK: 'USER#user-a', SK: `ITEM#${FOLDER_ID}` } })
      .resolves({ Item: record(FOLDER_ID, 'FOLDER', 'Private') });

    const res = await listChildren(
      apiEvent({ sub: 'user-b', pathParameters: { id: FOLDER_ID } }),
      context,
    );

    expect(res.statusCode).toBe(404);
    expect(ddb.commandCalls(QueryCommand)).toHaveLength(0);
  });

  it('rejects an id that is neither "root" nor a UUID with 400', async () => {
    const res = await listChildren(
      apiEvent({ sub: 'user-a', pathParameters: { id: 'not-a-uuid' } }),
      context,
    );
    expect(res.statusCode).toBe(400);
  });
});

describe('PATCH /items/{id}', () => {
  it('renames an item and recomputes its sort key', async () => {
    ddb.on(GetCommand).resolves({ Item: record(FOLDER_ID, 'FOLDER', 'Old') });
    ddb.on(UpdateCommand).resolves({ Attributes: record(FOLDER_ID, 'FOLDER', 'New Name') });

    const res = await renameItem(
      apiEvent({ sub: 'user-a', pathParameters: { id: FOLDER_ID }, body: { name: 'New Name' } }),
      context,
    );

    expect(res.statusCode).toBe(200);
    expect(bodyOf(res).item.name).toBe('New Name');

    const update = ddb.commandCalls(UpdateCommand)[0]!.args[0].input;
    expect(update.Key).toEqual({ PK: 'USER#user-a', SK: `ITEM#${FOLDER_ID}` });
    expect(update.ExpressionAttributeValues?.[':sk']).toBe('1#new name');
    expect(update.ConditionExpression).toBe('attribute_exists(PK)');
  });

  it('answers 404 for an item that is not the caller’s', async () => {
    ddb
      .on(GetCommand, { Key: { PK: 'USER#user-a', SK: `ITEM#${FOLDER_ID}` } })
      .resolves({ Item: record(FOLDER_ID, 'FOLDER', 'Private') });

    const res = await renameItem(
      apiEvent({ sub: 'user-b', pathParameters: { id: FOLDER_ID }, body: { name: 'Mine now' } }),
      context,
    );

    expect(res.statusCode).toBe(404);
    expect(ddb.commandCalls(UpdateCommand)).toHaveLength(0);
  });

  it('answers 404 when the item disappears between the read and the update', async () => {
    ddb.on(GetCommand).resolves({ Item: record(FOLDER_ID, 'FOLDER', 'Old') });
    ddb
      .on(UpdateCommand)
      .rejects(new ConditionalCheckFailedException({ message: 'gone', $metadata: {} }));

    const res = await renameItem(
      apiEvent({ sub: 'user-a', pathParameters: { id: FOLDER_ID }, body: { name: 'New' } }),
      context,
    );

    expect(res.statusCode).toBe(404);
  });

  it('rejects an invalid id or name with 400', async () => {
    for (const event of [
      apiEvent({ sub: 'user-a', pathParameters: { id: 'root' }, body: { name: 'x' } }),
      apiEvent({ sub: 'user-a', pathParameters: { id: FOLDER_ID }, body: { name: '' } }),
    ]) {
      expect((await renameItem(event, context)).statusCode).toBe(400);
    }
  });
});
