import { z } from 'zod';

/**
 * Contract for GET /me: who the API thinks the caller is, taken from the verified token.
 * (Access tokens carry the user's `sub` and scopes, but not their email: that is in the ID token.)
 */
export const MeResponse = z.object({
  userId: z.string().min(1),
  scopes: z.array(z.string()),
  tokenUse: z.enum(['access', 'id']),
});

export type MeResponse = z.infer<typeof MeResponse>;
