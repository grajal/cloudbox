import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyStructuredResultV2,
} from 'aws-lambda';
import type { z } from 'zod';
import { HttpError } from './errors.js';

export type ApiEvent = APIGatewayProxyEventV2WithJWTAuthorizer;

export const json = (statusCode: number, body: unknown): APIGatewayProxyStructuredResultV2 => ({
  statusCode,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

/**
 * The caller's user id, taken from the token API Gateway already verified.
 * Never read the user id from the request body or path: that would let users act as each other.
 */
export function getUserId(event: ApiEvent): string {
  const sub = event.requestContext.authorizer?.jwt?.claims?.sub;
  if (typeof sub !== 'string' || sub === '') throw new HttpError(401, 'Unauthorized');
  return sub;
}

function validate<T>(schema: z.ZodType<T>, data: unknown, what: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
    }));
    throw new HttpError(400, `Invalid ${what}`, details);
  }
  return result.data;
}

export function parseBody<T>(event: ApiEvent, schema: z.ZodType<T>): T {
  let data: unknown;
  try {
    const raw = event.isBase64Encoded
      ? Buffer.from(event.body ?? '', 'base64').toString('utf8')
      : (event.body ?? '');
    data = JSON.parse(raw);
  } catch {
    throw new HttpError(400, 'Request body must be valid JSON');
  }
  return validate(schema, data, 'request body');
}

export function parsePathParam<T>(event: ApiEvent, name: string, schema: z.ZodType<T>): T {
  return validate(schema, event.pathParameters?.[name], `path parameter "${name}"`);
}
