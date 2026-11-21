import { fetchAuthSession } from 'aws-amplify/auth';
import { MeResponse } from '@cloudbox/shared';

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

/**
 * Calls the CloudBox API as the signed-in user and validates the response against a schema,
 * so the rest of the app only ever sees data that matches the shared contract.
 */
export async function apiGet<T>(path: string, schema: Parser<T>): Promise<T> {
  // Amplify returns the stored access token, refreshing it first if it has expired.
  const { tokens } = await fetchAuthSession();
  const accessToken = tokens?.accessToken?.toString();
  if (!accessToken) throw new ApiError(401, 'Not signed in');

  const response = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new ApiError(response.status, `Request to ${path} failed (HTTP ${response.status})`);
  }

  return schema.parse(await response.json());
}

export const getMe = () => apiGet('/me', MeResponse);
