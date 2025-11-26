import { z } from 'zod';

export const product-response.dtoSchema = z.object({
  // Define schema fields
});

export type product-response.dto = z.infer<typeof product-response.dtoSchema>;
