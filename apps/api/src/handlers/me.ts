import middy from '@middy/core';
import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyStructuredResultV2,
} from 'aws-lambda';
import { MeResponse } from '@cloudbox/shared';

/**
 * GET /me: protected by API Gateway's JWT authorizer.
 * By the time this runs, API Gateway has already verified the token's signature, expiry,
 * issuer and client. We only read the verified claims it passes along in the event.
 */
const baseHandler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyStructuredResultV2> => {
  const claims = event.requestContext.authorizer.jwt.claims;

  const body = MeResponse.parse({
    userId: claims.sub,
    scopes: String(claims.scope ?? '')
      .split(' ')
      .filter(Boolean),
    tokenUse: claims.token_use,
  });

  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  };
};

export const handler = middy(baseHandler);
