import { z } from 'zod';

export const update-user.dtoSchema = z.object({
  // Define schema fields
});

export type update-user.dto = z.infer<typeof update-user.dtoSchema>;
