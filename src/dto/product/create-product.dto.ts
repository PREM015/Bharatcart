import { z } from 'zod';

export const create-product.dtoSchema = z.object({
  // Define schema fields
});

export type create-product.dto = z.infer<typeof create-product.dtoSchema>;
