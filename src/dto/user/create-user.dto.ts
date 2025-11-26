import { z } from 'zod';

export const create-user.dtoSchema = z.object({
  // Define schema fields
});

export type create-user.dto = z.infer<typeof create-user.dtoSchema>;
