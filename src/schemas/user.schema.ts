import { z } from 'zod';

export const user.schemaSchema = z.object({
  // Define validation schema
  id: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type user.schemaInput = z.infer<typeof user.schemaSchema>;
