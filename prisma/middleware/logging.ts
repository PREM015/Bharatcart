import { Prisma } from '@prisma/client';

export const loggingMiddleware: Prisma.Middleware = async (params, next) => {
  // Before operation
  console.log('Operation:', params.model, params.action);

  const result = await next(params);

  // After operation

  return result;
};
