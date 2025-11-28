/**
 * Variable Resolver
 * Purpose: Resolve dynamic variables in templates
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

export class VariableResolver {
  async resolve(
    variables: Record<string, any>,
    context: { userId?: number; orderId?: number }
  ): Promise<Record<string, any>> {
    const resolved: Record<string, any> = { ...variables };

    if (context.userId) {
      const user = await prisma.user.findUnique({
        where: { id: context.userId },
      });
      if (user) {
        resolved.user = {
          name: user.name,
          email: user.email,
          firstName: user.name?.split(' ')[0],
        };
      }
    }

    if (context.orderId) {
      const order = await prisma.order.findUnique({
        where: { id: context.orderId },
        include: { items: true },
      });
      if (order) {
        resolved.order = {
          id: order.id,
          total: order.total / 100,
          itemCount: order.items.length,
          status: order.status,
        };
      }
    }

    return resolved;
  }
}

export default VariableResolver;
