import { describe, expect, it } from 'vitest';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, Context } from 'aws-lambda';
import { MeResponse } from '@cloudbox/shared';
import { handler } from './me.js';

// Builds the part of the event that API Gateway adds after the JWT authorizer approves a token.
const eventWithClaims = (claims: Record<string, string>) =>
  ({
    version: '2.0',
    routeKey: 'GET /me',
    rawPath: '/me',
    requestContext: {
      http: { method: 'GET', path: '/me' },
      authorizer: { jwt: { claims, scopes: null } },
    },
  }) as unknown as APIGatewayProxyEventV2WithJWTAuthorizer;

const context = {} as Context;

describe('GET /me', () => {
  it('returns the caller identity taken from the verified claims', async () => {
    const res = await handler(
      eventWithClaims({
        sub: '8f2c1a6e-0000-0000-0000-000000000000',
        scope: 'openid email profile',
        token_use: 'access',
      }),
      context,
    );

    expect(res.statusCode).toBe(200);
    const body = MeResponse.parse(JSON.parse(res.body ?? ''));
    expect(body).toEqual({
      userId: '8f2c1a6e-0000-0000-0000-000000000000',
      scopes: ['openid', 'email', 'profile'],
      tokenUse: 'access',
    });
  });

  it('rejects a token without a subject instead of answering with a made-up user', async () => {
    await expect(handler(eventWithClaims({ token_use: 'access' }), context)).rejects.toThrow();
  });
});
