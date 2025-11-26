import { z } from 'zod';

export const auth.schemaSchema = z.object({
  // Define validation schema
  id: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type auth.schemaInput = z.infer<typeof auth.schemaSchema>;
