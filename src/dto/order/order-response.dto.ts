import { z } from 'zod';

export const order-response.dtoSchema = z.object({
  // Define schema fields
});

export type order-response.dto = z.infer<typeof order-response.dtoSchema>;
