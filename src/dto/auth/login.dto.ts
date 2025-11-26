import { z } from 'zod';

export const login.dtoSchema = z.object({
  // Define schema fields
});

export type login.dto = z.infer<typeof login.dtoSchema>;
