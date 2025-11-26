import { Prisma } from '@prisma/client';

export const audit-logExtension = Prisma.defineExtension({
  name: 'audit-log',
  model: {
    $allModels: {
      // Add extension methods
    },
  },
});
