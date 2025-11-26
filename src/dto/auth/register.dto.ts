import { z } from 'zod';

export const register.dtoSchema = z.object({
  // Define schema fields
});

export type register.dto = z.infer<typeof register.dtoSchema>;
