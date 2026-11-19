import middy from '@middy/core';
import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { HealthResponse } from '@cloudbox/shared';

/**
 * GET /health — the simplest possible Lambda behind API Gateway (HTTP API, payload v2).
 * The business logic is a plain async function; Middy wraps it so we can add middleware
 * (validation, error handling, logging) later without touching this code.
 */
const baseHandler = async (
  _event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> => {
  const body = HealthResponse.parse({ status: 'ok', time: new Date().toISOString() });

  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  };
};

export const handler = middy(baseHandler);
