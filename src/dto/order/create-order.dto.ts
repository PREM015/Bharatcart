import { z } from 'zod';

export const create-order.dtoSchema = z.object({
  // Define schema fields
});

export type create-order.dto = z.infer<typeof create-order.dtoSchema>;
