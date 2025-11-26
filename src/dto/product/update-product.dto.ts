import { z } from 'zod';

export const update-product.dtoSchema = z.object({
  // Define schema fields
});

export type update-product.dto = z.infer<typeof update-product.dtoSchema>;
