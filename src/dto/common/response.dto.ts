import { z } from 'zod';

export const response.dtoSchema = z.object({
  // Define schema fields
});

export type response.dto = z.infer<typeof response.dtoSchema>;
