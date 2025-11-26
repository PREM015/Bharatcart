import { Prisma } from '@prisma/client';

export const soft-deleteExtension = Prisma.defineExtension({
  name: 'soft-delete',
  model: {
    $allModels: {
      // Add extension methods
    },
  },
});
