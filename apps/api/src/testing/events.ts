import type { Context } from 'aws-lambda';
import type { ApiEvent } from '../lib/http.js';

export const context = {} as Context;

type EventOptions = {
  /** The verified user id API Gateway would put in the token claims. Omit to simulate no claims. */
  sub?: string;
  body?: unknown;
  rawBody?: string;
  pathParameters?: Record<string, string>;
};

/** A minimal fake of what API Gateway passes to Lambda after the JWT authorizer approves a call. */
export function apiEvent({ sub, body, rawBody, pathParameters }: EventOptions = {}): ApiEvent {
  return {
    version: '2.0',
    pathParameters,
    body: rawBody ?? (body === undefined ? undefined : JSON.stringify(body)),
    isBase64Encoded: false,
    requestContext: {
      http: { method: 'POST', path: '/' },
      authorizer: { jwt: { claims: sub ? { sub } : {}, scopes: null } },
    },
  } as unknown as ApiEvent;
}
