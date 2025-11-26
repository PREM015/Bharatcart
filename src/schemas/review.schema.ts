import { z } from 'zod';

export const review.schemaSchema = z.object({
  // Define validation schema
  id: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type review.schemaInput = z.infer<typeof review.schemaSchema>;
