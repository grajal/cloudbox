import middy from '@middy/core';
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { ListChildrenResponse, ParentId } from '@cloudbox/shared';
import { getUserId, json, parsePathParam } from '../lib/http.js';
import type { ApiEvent } from '../lib/http.js';
import { httpErrorHandler } from '../lib/middleware.js';
import { listChildren } from '../repos/items.js';

/** GET /folders/{id}/children: list a folder's contents ("root" for the top level). */
const baseHandler = async (event: ApiEvent): Promise<APIGatewayProxyStructuredResultV2> => {
  const sub = getUserId(event);
  const folderId = parsePathParam(event, 'id', ParentId);

  const items = await listChildren(sub, folderId);
  return json(200, ListChildrenResponse.parse({ items }));
};

export const handler = middy(baseHandler).use(httpErrorHandler());
