/**
 * Repository Pattern
 * Purpose: Abstraction layer between business logic and data access
 * Use Case: Database operations, data persistence
 * 
 * Benefits:
 * - Separation of concerns
 * - Testability (easy to mock)
 * - Centralized data access logic
 * - Database agnostic business logic
 * 
 * @example
 * ```typescript
 * const userRepo = new UserRepository();
 * const user = await userRepo.findById(1);
 * await userRepo.update(user.id, { name: 'New Name' });
 * ```
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * Base Repository Interface
 */
export interface IRepository<T> {
  findById(id: number): Promise<T | null>;
  findAll(options?: QueryOptions): Promise<T[]>;
  create(data: Partial<T>): Promise<T>;
  update(id: number, data: Partial<T>): Promise<T>;
  delete(id: number): Promise<boolean>;
  count(where?: any): Promise<number>;
}

export interface QueryOptions {
  where?: any;
  orderBy?: any;
  take?: number;
  skip?: number;
  include?: any;
}

/**
 * Abstract Base Repository
 */
export abstract class BaseRepository<T> implements IRepository<T> {
  protected abstract model: any;

  async findById(id: number): Promise<T | null> {
    logger.debug('Repository findById', { model: this.model.name, id });
    return await this.model.findUnique({ where: { id } });
  }

  async findAll(options?: QueryOptions): Promise<T[]> {
    logger.debug('Repository findAll', { model: this.model.name, options });
    return await this.model.findMany(options);
  }

  async create(data: Partial<T>): Promise<T> {
    logger.info('Repository create', { model: this.model.name });
    return await this.model.create({ data });
  }

  async update(id: number, data: Partial<T>): Promise<T> {
    logger.info('Repository update', { model: this.model.name, id });
    return await this.model.update({
      where: { id },
      data,
    });
  }

  async delete(id: number): Promise<boolean> {
    logger.info('Repository delete', { model: this.model.name, id });
    await this.model.delete({ where: { id } });
    return true;
  }

  async count(where?: any): Promise<number> {
    return await this.model.count({ where });
  }
}

/**
 * User Repository
 */
export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  created_at: Date;
}

export class UserRepository extends BaseRepository<User> {
  protected model = prisma.user;

  async findByEmail(email: string): Promise<User | null> {
    logger.debug('Finding user by email', { email });
    return await this.model.findUnique({ where: { email } });
  }

  async findByRole(role: string): Promise<User[]> {
    return await this.model.findMany({ where: { role } });
  }

  async updateLastLogin(id: number): Promise<void> {
    await this.model.update({
      where: { id },
      data: { last_login: new Date() },
    });
  }

  async searchUsers(query: string): Promise<User[]> {
    return await this.model.findMany({
      where: {
        OR: [
          { email: { contains: query } },
          { name: { contains: query } },
        ],
      },
    });
  }
}

/**
 * Product Repository
 */
export interface Product {
  id: number;
  name: string;
  price: number;
  stock_quantity: number;
  category_id: number;
}

export class ProductRepository extends BaseRepository<Product> {
  protected model = prisma.product;

  async findByCategory(categoryId: number): Promise<Product[]> {
    return await this.model.findMany({
      where: { category_id: categoryId },
    });
  }

  async findInStock(): Promise<Product[]> {
    return await this.model.findMany({
      where: { stock_quantity: { gt: 0 } },
    });
  }

  async updateStock(id: number, quantity: number): Promise<Product> {
    return await this.model.update({
      where: { id },
      data: { stock_quantity: { increment: quantity } },
    });
  }

  async searchProducts(query: string): Promise<Product[]> {
    return await this.model.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { description: { contains: query } },
        ],
      },
    });
  }

  async getFeatured(limit: number = 10): Promise<Product[]> {
    return await this.model.findMany({
      where: { is_featured: true },
      take: limit,
    });
  }
}

/**
 * Order Repository
 */
export interface Order {
  id: number;
  user_id: number;
  total: number;
  status: string;
  created_at: Date;
}

export class OrderRepository extends BaseRepository<Order> {
  protected model = prisma.order;

  async findByUser(userId: number): Promise<Order[]> {
    return await this.model.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
  }

  async findByStatus(status: string): Promise<Order[]> {
    return await this.model.findMany({ where: { status } });
  }

  async updateStatus(id: number, status: string): Promise<Order> {
    return await this.model.update({
      where: { id },
      data: { status },
    });
  }

  async getTotalSales(startDate: Date, endDate: Date): Promise<number> {
    const result = await this.model.aggregate({
      where: {
        created_at: { gte: startDate, lte: endDate },
        status: { notIn: ['cancelled', 'refunded'] },
      },
      _sum: { total: true },
    });

    return result._sum.total || 0;
  }
}

/**
 * Unit of Work Pattern
 * Coordinates multiple repositories in a transaction
 */
export class UnitOfWork {
  private transaction: any;

  async begin(): Promise<void> {
    // Would start a database transaction
  }

  async commit(): Promise<void> {
    // Would commit transaction
  }

  async rollback(): Promise<void> {
    // Would rollback transaction
  }

  async execute<T>(work: () => Promise<T>): Promise<T> {
    await this.begin();
    try {
      const result = await work();
      await this.commit();
      return result;
    } catch (error) {
      await this.rollback();
      throw error;
    }
  }
}

export default BaseRepository;
