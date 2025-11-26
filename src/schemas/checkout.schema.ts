import { z } from 'zod';

export const checkout.schemaSchema = z.object({
  // Define validation schema
  id: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type checkout.schemaInput = z.infer<typeof checkout.schemaSchema>;
