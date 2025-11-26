import { z } from 'zod';

export const settings.schemaSchema = z.object({
  // Define validation schema
  id: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type settings.schemaInput = z.infer<typeof settings.schemaSchema>;
