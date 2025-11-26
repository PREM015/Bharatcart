import { z } from 'zod';

export const reset-password.dtoSchema = z.object({
  // Define schema fields
});

export type reset-password.dto = z.infer<typeof reset-password.dtoSchema>;
