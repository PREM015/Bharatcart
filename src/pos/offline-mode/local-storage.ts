/**
 * Local Storage Manager
 * Purpose: Manage offline data storage
 * Description: IndexedDB wrapper, cache management, data persistence
 */

import { logger } from '@/lib/logger';
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface POSDatabase extends DBSchema {
  transactions: {
    key: string;
    value: any;
    indexes: { 'by-date': Date; 'by-status': string };
  };
  products: {
    key: string;
    value: any;
    indexes: { 'by-sku': string; 'by-barcode': string };
  };
  customers: {
    key: string;
    value: any;
    indexes: { 'by-email': string; 'by-phone': string };
  };
  config: {
    key: string;
    value: any;
  };
  sync_queue: {
    key: string;
    value: any;
    indexes: { 'by-status': string; 'by-timestamp': Date };
  };
}

export class LocalStorage {
  private db?: IDBPDatabase<POSDatabase>;
  private readonly DB_NAME = 'pos_offline_db';
  private readonly DB_VERSION = 1;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize database
   */
  private async initialize(): Promise<void> {
    try {
      this.db = await openDB<POSDatabase>(this.DB_NAME, this.DB_VERSION, {
        upgrade(db) {
          // Transactions store
          if (!db.objectStoreNames.contains('transactions')) {
            const txStore = db.createObjectStore('transactions', {
              keyPath: 'id',
            });
            txStore.createIndex('by-date', 'created_at');
            txStore.createIndex('by-status', 'status');
          }

          // Products store
          if (!db.objectStoreNames.contains('products')) {
            const prodStore = db.createObjectStore('products', {
              keyPath: 'id',
            });
            prodStore.createIndex('by-sku', 'sku');
            prodStore.createIndex('by-barcode', 'barcode');
          }

          // Customers store
          if (!db.objectStoreNames.contains('customers')) {
            const custStore = db.createObjectStore('customers', {
              keyPath: 'id',
            });
            custStore.createIndex('by-email', 'email');
            custStore.createIndex('by-phone', 'phone');
          }

          // Config store
          if (!db.objectStoreNames.contains('config')) {
            db.createObjectStore('config');
          }

          // Sync queue store
          if (!db.objectStoreNames.contains('sync_queue')) {
            const syncStore = db.createObjectStore('sync_queue', {
              keyPath: 'id',
            });
            syncStore.createIndex('by-status', 'status');
            syncStore.createIndex('by-timestamp', 'timestamp');
          }
        },
      });

      logger.info('Local database initialized');
    } catch (error) {
      logger.error('Failed to initialize database', { error });
      throw error;
    }
  }

  /**
   * Ensure database is ready
   */
  private async ensureDB(): Promise<IDBPDatabase<POSDatabase>> {
    if (!this.db) {
      await this.initialize();
    }
    return this.db!;
  }

  /**
   * Set item in store
   */
  async set<T>(key: string, value: T, store: keyof POSDatabase = 'config'): Promise<void> {
    try {
      const db = await this.ensureDB();
      await db.put(store as any, value, key as any);
      
      logger.debug('Item saved to local storage', { store, key });
    } catch (error) {
      logger.error('Failed to save to local storage', { store, key, error });
      throw error;
    }
  }

  /**
   * Get item from store
   */
  async get<T>(key: string, store: keyof POSDatabase = 'config'): Promise<T | undefined> {
    try {
      const db = await this.ensureDB();
      const value = await db.get(store as any, key as any);
      
      return value as T;
    } catch (error) {
      logger.error('Failed to get from local storage', { store, key, error });
      return undefined;
    }
  }

  /**
   * Delete item from store
   */
  async delete(key: string, store: keyof POSDatabase = 'config'): Promise<void> {
    try {
      const db = await this.ensureDB();
      await db.delete(store as any, key as any);
      
      logger.debug('Item deleted from local storage', { store, key });
    } catch (error) {
      logger.error('Failed to delete from local storage', { store, key, error });
      throw error;
    }
  }

  /**
   * Get all items from store
   */
  async getAll<T>(store: keyof POSDatabase): Promise<T[]> {
    try {
      const db = await this.ensureDB();
      const items = await db.getAll(store as any);
      
      return items as T[];
    } catch (error) {
      logger.error('Failed to get all from local storage', { store, error });
      return [];
    }
  }

  /**
   * Clear store
   */
  async clear(store: keyof POSDatabase): Promise<void> {
    try {
      const db = await this.ensureDB();
      await db.clear(store as any);
      
      logger.info('Store cleared', { store });
    } catch (error) {
      logger.error('Failed to clear store', { store, error });
      throw error;
    }
  }

  /**
   * Save transaction
   */
  async saveTransaction(transaction: any): Promise<void> {
    await this.set(transaction.id, transaction, 'transactions');
  }

  /**
   * Get transactions
   */
  async getTransactions(filter?: {
    status?: string;
    start_date?: Date;
    end_date?: Date;
  }): Promise<any[]> {
    const db = await this.ensureDB();
    let transactions = await db.getAll('transactions');

    if (filter) {
      if (filter.status) {
        transactions = transactions.filter(tx => tx.status === filter.status);
      }

      if (filter.start_date) {
        transactions = transactions.filter(
          tx => new Date(tx.created_at) >= filter.start_date!
        );
      }

      if (filter.end_date) {
        transactions = transactions.filter(
          tx => new Date(tx.created_at) <= filter.end_date!
        );
      }
    }

    return transactions;
  }

  /**
   * Save product
   */
  async saveProduct(product: any): Promise<void> {
    await this.set(product.id, product, 'products');
  }

  /**
   * Get product by SKU
   */
  async getProductBySKU(sku: string): Promise<any | undefined> {
    const db = await this.ensureDB();
    const index = db.transaction('products').store.index('by-sku');
    return await index.get(sku);
  }

  /**
   * Get product by barcode
   */
  async getProductByBarcode(barcode: string): Promise<any | undefined> {
    const db = await this.ensureDB();
    const index = db.transaction('products').store.index('by-barcode');
    return await index.get(barcode);
  }

  /**
   * Sync products from server
   */
  async syncProducts(products: any[]): Promise<void> {
    logger.info('Syncing products to local storage', { count: products.length });

    const db = await this.ensureDB();
    const tx = db.transaction('products', 'readwrite');

    await Promise.all(
      products.map(product => tx.store.put(product))
    );

    await tx.done;

    logger.info('Products synced successfully');
  }

  /**
   * Get storage usage
   */
  async getStorageUsage(): Promise<{
    usage: number;
    quota: number;
    percentage: number;
  }> {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const percentage = quota > 0 ? (usage / quota) * 100 : 0;

      return {
        usage,
        quota,
        percentage,
      };
    }

    return {
      usage: 0,
      quota: 0,
      percentage: 0,
    };
  }

  /**
   * Clear all data
   */
  async clearAll(): Promise<void> {
    logger.warn('Clearing all local storage');

    const stores: Array<keyof POSDatabase> = [
      'transactions',
      'products',
      'customers',
      'config',
      'sync_queue',
    ];

    for (const store of stores) {
      await this.clear(store);
    }

    logger.info('All local storage cleared');
  }
}

export default LocalStorage;
