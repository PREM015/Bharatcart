import { PrismaClient } from '@prisma/client';

// Prevent multiple instances in development
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Helper functions for common queries

export async function getUserById(id: string) {
  return await prisma.user.findUnique({
    where: { id },
    include: {
      admin: true,
      addresses: true,
    },
  });
}

export async function getProductWithDetails(id: string) {
  return await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      admin: {
        include: {
          user: {
            select: {
              name: true,
              avatar: true,
            },
          },
        },
      },
      reviews: {
        include: {
          user: {
            select: {
              name: true,
              avatar: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
      variants: true,
    },
  });
}

export async function getOrderWithDetails(orderId: string) {
  return await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          phone: true,
        },
      },
      items: {
        include: {
          product: {
            select: {
              title: true,
              thumbnail: true,
              slug: true,
            },
          },
        },
      },
      statusHistory: {
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  });
}

export async function getUserCart(userId: string) {
  return await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            include: {
              admin: true,
            },
          },
        },
      },
    },
  });
}

export async function getUserWishlist(userId: string) {
  return await prisma.wishlist.findMany({
    where: { userId },
    include: {
      product: {
        include: {
          category: true,
          admin: true,
        },
      },
    },
  });
}