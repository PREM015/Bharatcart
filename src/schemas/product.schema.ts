import { z } from 'zod';

export const product.schemaSchema = z.object({
  // Define validation schema
  id: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type product.schemaInput = z.infer<typeof product.schemaSchema>;
