import { z } from 'zod';

export const pagination.dtoSchema = z.object({
  // Define schema fields
});

export type pagination.dto = z.infer<typeof pagination.dtoSchema>;
