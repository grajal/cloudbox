import middy from '@middy/core';
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { CreateFolderRequest, ItemResponse } from '@cloudbox/shared';
import { getUserId, json, parseBody } from '../lib/http.js';
import type { ApiEvent } from '../lib/http.js';
import { httpErrorHandler } from '../lib/middleware.js';
import { createFolder } from '../repos/items.js';

/** POST /folders: create a folder for the caller. */
const baseHandler = async (event: ApiEvent): Promise<APIGatewayProxyStructuredResultV2> => {
  const sub = getUserId(event);
  const { name, parentId } = parseBody(event, CreateFolderRequest);

  const item = await createFolder(sub, name, parentId);
  return json(201, ItemResponse.parse({ item }));
};

export const handler = middy(baseHandler).use(httpErrorHandler());
