import 'dotenv/config';

import { z } from 'zod';

const envSchema = z.object({
  DISCORD_TOKEN: z.string(),
  REDIS_URL: z.string().url(),
});

export const env = envSchema.parse(process.env);
