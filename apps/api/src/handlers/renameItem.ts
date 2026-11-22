import middy from '@middy/core';
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { ItemId, ItemResponse, RenameItemRequest } from '@cloudbox/shared';
import { getUserId, json, parseBody, parsePathParam } from '../lib/http.js';
import type { ApiEvent } from '../lib/http.js';
import { httpErrorHandler } from '../lib/middleware.js';
import { renameItem } from '../repos/items.js';

/** PATCH /items/{id}: rename a folder or file owned by the caller. */
const baseHandler = async (event: ApiEvent): Promise<APIGatewayProxyStructuredResultV2> => {
  const sub = getUserId(event);
  const id = parsePathParam(event, 'id', ItemId);
  const { name } = parseBody(event, RenameItemRequest);

  const item = await renameItem(sub, id, name);
  return json(200, ItemResponse.parse({ item }));
};

export const handler = middy(baseHandler).use(httpErrorHandler());
