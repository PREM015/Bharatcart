import { z } from 'zod';

export const address.schemaSchema = z.object({
  // Define validation schema
  id: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type address.schemaInput = z.infer<typeof address.schemaSchema>;
