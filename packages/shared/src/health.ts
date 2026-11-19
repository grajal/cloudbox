import { z } from 'zod';

/** Contract for GET /health — shared by the API (producer) and the web app (consumer). */
export const HealthResponse = z.object({
  status: z.literal('ok'),
  time: z.iso.datetime(),
});

export type HealthResponse = z.infer<typeof HealthResponse>;
