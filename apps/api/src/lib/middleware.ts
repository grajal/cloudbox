import type { MiddlewareObj } from '@middy/core';
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { HttpError } from './errors.js';
import { json } from './http.js';
import type { ApiEvent } from './http.js';

/**
 * Middy middleware: turns thrown errors into HTTP responses, so handlers can simply
 * `throw new HttpError(404, ...)`. Unknown errors are logged and answered with a generic 500
 * so internal details never reach the client.
 */
export const httpErrorHandler = (): MiddlewareObj<ApiEvent, APIGatewayProxyStructuredResultV2> => ({
  onError: async (request) => {
    const { error } = request;

    if (error instanceof HttpError) {
      request.response = json(error.status, { message: error.message, details: error.details });
      return;
    }

    console.error('Unhandled error', error);
    request.response = json(500, { message: 'Internal server error' });
  },
});
