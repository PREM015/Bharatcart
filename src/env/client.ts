import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  // Add more env variables
});

export const env = envSchema.parse(process.env);
