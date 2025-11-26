import { z } from 'zod';

export const add-to-cart.dtoSchema = z.object({
  // Define schema fields
});

export type add-to-cart.dto = z.infer<typeof add-to-cart.dtoSchema>;
