import { z } from 'zod';

export const order.schemaSchema = z.object({
  // Define validation schema
  id: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type order.schemaInput = z.infer<typeof order.schemaSchema>;
