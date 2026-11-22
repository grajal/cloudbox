import { fetchAuthSession } from 'aws-amplify/auth';

const baseUrl = import.meta.env.VITE_API_URL?.replace(/\/+$/, '');

if (!baseUrl) {
  throw new Error('Missing VITE_API_URL. Copy apps/web/.env.example to .env.local and fill it in.');
}

// Anything with a parse() method works, which includes every Zod schema from @cloudbox/shared.
type Parser<T> = { parse: (data: unknown) => T };

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Text safe to show the user for any thrown value. */
export const errorText = (error: unknown): string =>
  error instanceof Error ? error.message : 'Something went wrong';

/**
 * The API answers errors with `{ "message": "...", "details": [{ "path", "message" }] }`.
 * The first detail is the specific, user-friendly reason ("Name cannot contain "/""),
 * the top-level message is a technical summary ("Invalid request body").
 */
async function errorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { message?: unknown; details?: unknown } | null;

    if (Array.isArray(body?.details)) {
      for (const detail of body.details as unknown[]) {
        if (typeof detail === 'object' && detail !== null && 'message' in detail) {
          if (typeof detail.message === 'string') return detail.message;
        }
      }
    }
    if (typeof body?.message === 'string') return body.message;
  } catch {
    // The body was not JSON: use the fallback.
  }
  return fallback;
}

/**
 * Calls the CloudBox API as the signed-in user and validates the response against a schema,
 * so the rest of the app only ever sees data that matches the shared contract.
 */
export async function apiRequest<T>(
  method: 'GET' | 'POST' | 'PATCH',
  path: string,
  schema: Parser<T>,
  body?: unknown,
): Promise<T> {
  // Amplify returns the stored access token, refreshing it first if it has expired.
  const { tokens } = await fetchAuthSession();
  const accessToken = tokens?.accessToken?.toString();
  if (!accessToken) throw new ApiError(401, 'Not signed in');

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    const message = await errorMessage(response, `Request failed (HTTP ${response.status})`);
    throw new ApiError(response.status, message);
  }

  return schema.parse(await response.json());
}
