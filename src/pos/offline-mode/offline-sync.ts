/**
 * Offline Sync Manager
 * Purpose: Sync data when connection is restored
 * Description: Queue management, conflict resolution, retry logic
 */

import { logger } from '@/lib/logger';
import { EventEmitter } from 'events';
import { LocalStorage } from './local-storage';

export interface SyncItem {
  id: string;
  type: 'transaction' | 'inventory' | 'customer' | 'config';
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: Date;
  retries: number;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
}

export interface SyncStatus {
  is_syncing: boolean;
  pending_items: number;
  last_sync: Date | null;
  sync_errors: number;
}

export class OfflineSyncManager extends EventEmitter {
  private storage: LocalStorage;
  private syncQueue: SyncItem[] = [];
  private isSyncing: boolean = false;
  private isOnline: boolean = navigator.onLine;
  private lastSync: Date | null = null;
  private syncErrors: number = 0;

  private readonly MAX_RETRIES = 3;
  private readonly SYNC_INTERVAL = 30000; // 30 seconds
  private syncIntervalId?: NodeJS.Timeout;

  constructor() {
    super();
    this.storage = new LocalStorage();

    // Load pending sync items
    this.loadSyncQueue();

    // Monitor online/offline status
    this.setupOnlineMonitoring();

    // Start auto-sync
    this.startAutoSync();
  }

  /**
   * Add item to sync queue
   */
  async queueSync(item: Omit<SyncItem, 'id' | 'timestamp' | 'retries' | 'status'>): Promise<void> {
    const syncItem: SyncItem = {
      ...item,
      id: this.generateId(),
      timestamp: new Date(),
      retries: 0,
      status: 'pending',
    };

    this.syncQueue.push(syncItem);

    // Save to local storage
    await this.storage.set('sync_queue', this.syncQueue);

    logger.info('Item queued for sync', {
      type: item.type,
      action: item.action,
      queue_length: this.syncQueue.length,
    });

    this.emit('item_queued', syncItem);

    // Try to sync immediately if online
    if (this.isOnline && !this.isSyncing) {
      this.sync();
    }
  }

  /**
   * Start syncing
   */
  async sync(): Promise<void> {
    if (this.isSyncing) {
      logger.warn('Sync already in progress');
      return;
    }

    if (!this.isOnline) {
      logger.warn('Cannot sync while offline');
      return;
    }

    const pendingItems = this.syncQueue.filter(
      item => item.status === 'pending' || item.status === 'failed'
    );

    if (pendingItems.length === 0) {
      logger.info('No items to sync');
      return;
    }

    logger.info('Starting sync', { items: pendingItems.length });

    this.isSyncing = true;
    this.emit('sync_started', { items: pendingItems.length });

    let synced = 0;
    let failed = 0;

    for (const item of pendingItems) {
      try {
        item.status = 'syncing';
        await this.syncItem(item);

        item.status = 'synced';
        synced++;

        this.emit('item_synced', item);
      } catch (error) {
        logger.error('Failed to sync item', {
          item_id: item.id,
          type: item.type,
          error,
        });

        item.retries++;
        failed++;

        if (item.retries >= this.MAX_RETRIES) {
          item.status = 'failed';
          this.emit('item_failed', item);
        } else {
          item.status = 'pending';
        }
      }
    }

    // Remove synced items
    this.syncQueue = this.syncQueue.filter(item => item.status !== 'synced');

    // Save updated queue
    await this.storage.set('sync_queue', this.syncQueue);

    this.lastSync = new Date();
    this.syncErrors = failed;
    this.isSyncing = false;

    logger.info('Sync completed', {
      synced,
      failed,
      remaining: this.syncQueue.length,
    });

    this.emit('sync_completed', {
      synced,
      failed,
      remaining: this.syncQueue.length,
    });
  }

  /**
   * Sync individual item
   */
  private async syncItem(item: SyncItem): Promise<void> {
    const endpoint = this.getEndpoint(item.type, item.action);
    const method = this.getHttpMethod(item.action);

    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Offline-Sync': 'true',
        'X-Sync-Timestamp': item.timestamp.toISOString(),
      },
      body: JSON.stringify(item.data),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Sync failed: ${error}`);
    }

    const result = await response.json();

    // Handle conflicts
    if (result.conflict) {
      await this.resolveConflict(item, result.server_data);
    }
  }

  /**
   * Resolve sync conflict
   */
  private async resolveConflict(localItem: SyncItem, serverData: any): Promise<void> {
    logger.warn('Sync conflict detected', {
      item_id: localItem.id,
      type: localItem.type,
    });

    this.emit('conflict', {
      local: localItem,
      server: serverData,
    });

    // Simple conflict resolution: server wins
    // In production, implement more sophisticated logic
    
    // Update local data with server version
    await this.storage.set(`${localItem.type}_${localItem.data.id}`, serverData);
  }

  /**
   * Get API endpoint for sync
   */
  private getEndpoint(type: string, action: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '/api';

    const endpoints = {
      transaction: {
        create: `${baseUrl}/pos/transactions/sync`,
        update: `${baseUrl}/pos/transactions/sync`,
        delete: `${baseUrl}/pos/transactions/sync`,
      },
      inventory: {
        create: `${baseUrl}/inventory/sync`,
        update: `${baseUrl}/inventory/sync`,
        delete: `${baseUrl}/inventory/sync`,
      },
      customer: {
        create: `${baseUrl}/customers/sync`,
        update: `${baseUrl}/customers/sync`,
        delete: `${baseUrl}/customers/sync`,
      },
      config: {
        create: `${baseUrl}/config/sync`,
        update: `${baseUrl}/config/sync`,
        delete: `${baseUrl}/config/sync`,
      },
    };

    return endpoints[type as keyof typeof endpoints][action as keyof typeof endpoints.transaction];
  }

  /**
   * Get HTTP method
   */
  private getHttpMethod(action: string): string {
    const methods = {
      create: 'POST',
      update: 'PUT',
      delete: 'DELETE',
    };

    return methods[action as keyof typeof methods];
  }

  /**
   * Setup online/offline monitoring
   */
  private setupOnlineMonitoring(): void {
    window.addEventListener('online', () => {
      logger.info('Connection restored');
      this.isOnline = true;
      this.emit('online');

      // Trigger sync
      this.sync();
    });

    window.addEventListener('offline', () => {
      logger.warn('Connection lost');
      this.isOnline = false;
      this.emit('offline');
    });
  }

  /**
   * Start auto-sync
   */
  private startAutoSync(): void {
    this.syncIntervalId = setInterval(() => {
      if (this.isOnline && !this.isSyncing && this.syncQueue.length > 0) {
        this.sync();
      }
    }, this.SYNC_INTERVAL);
  }

  /**
   * Stop auto-sync
   */
  stopAutoSync(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = undefined;
    }
  }

  /**
   * Load sync queue from storage
   */
  private async loadSyncQueue(): Promise<void> {
    try {
      const queue = await this.storage.get<SyncItem[]>('sync_queue');
      if (queue) {
        this.syncQueue = queue;
        logger.info('Loaded sync queue', { items: queue.length });
      }
    } catch (error) {
      logger.error('Failed to load sync queue', { error });
    }
  }

  /**
   * Get sync status
   */
  getStatus(): SyncStatus {
    return {
      is_syncing: this.isSyncing,
      pending_items: this.syncQueue.filter(
        item => item.status === 'pending' || item.status === 'failed'
      ).length,
      last_sync: this.lastSync,
      sync_errors: this.syncErrors,
    };
  }

  /**
   * Clear sync queue
   */
  async clearQueue(): Promise<void> {
    logger.warn('Clearing sync queue');

    this.syncQueue = [];
    await this.storage.set('sync_queue', []);

    this.emit('queue_cleared');
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Retry failed items
   */
  async retryFailed(): Promise<void> {
    logger.info('Retrying failed sync items');

    const failedItems = this.syncQueue.filter(item => item.status === 'failed');

    failedItems.forEach(item => {
      item.status = 'pending';
      item.retries = 0;
    });

    await this.storage.set('sync_queue', this.syncQueue);

    if (this.isOnline) {
      await this.sync();
    }
  }
}

export default OfflineSyncManager;
