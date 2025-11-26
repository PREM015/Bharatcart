import { z } from 'zod';

export const cart-response.dtoSchema = z.object({
  // Define schema fields
});

export type cart-response.dto = z.infer<typeof cart-response.dtoSchema>;
