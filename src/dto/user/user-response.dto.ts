import { z } from 'zod';

export const user-response.dtoSchema = z.object({
  // Define schema fields
});

export type user-response.dto = z.infer<typeof user-response.dtoSchema>;
