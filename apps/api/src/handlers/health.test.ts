import { describe, expect, it } from 'vitest';
import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import { HealthResponse } from '@cloudbox/shared';
import { handler } from './health.js';

// A minimal fake of what API Gateway (HTTP API) sends to Lambda.
const event = {
  version: '2.0',
  routeKey: 'GET /health',
  rawPath: '/health',
  requestContext: { http: { method: 'GET', path: '/health' } },
} as unknown as APIGatewayProxyEventV2;

const context = {} as Context;

describe('GET /health', () => {
  it('returns 200 with a body matching the shared contract', async () => {
    const res = await handler(event, context);

    expect(res.statusCode).toBe(200);
    expect(HealthResponse.safeParse(JSON.parse(res.body ?? '')).success).toBe(true);
  });
});
