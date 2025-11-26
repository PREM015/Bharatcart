import { z } from 'zod';

export const contact.schemaSchema = z.object({
  // Define validation schema
  id: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type contact.schemaInput = z.infer<typeof contact.schemaSchema>;
