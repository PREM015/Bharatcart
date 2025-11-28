/**
 * Singleton Pattern
 * Purpose: Ensure only one instance of a class exists
 * Use Case: Database connections, configuration, logging
 * 
 * Benefits:
 * - Single point of access
 * - Controlled instantiation
 * - Reduced memory footprint
 * - Global state management
 * 
 * @example
 * ```typescript
 * const config = ConfigManager.getInstance();
 * const db = DatabaseConnection.getInstance();
 * ```
 */

import { logger } from '@/lib/logger';

/**
 * Configuration Manager Singleton
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private config: Map<string, any>;

  private constructor() {
    this.config = new Map();
    this.loadConfig();
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private loadConfig(): void {
    // Load configuration from environment variables
    this.config.set('app.name', process.env.APP_NAME || 'E-commerce');
    this.config.set('app.url', process.env.APP_URL || 'http://localhost:3000');
    this.config.set('database.url', process.env.DATABASE_URL);
    this.config.set('redis.host', process.env.REDIS_HOST || 'localhost');
    this.config.set('redis.port', parseInt(process.env.REDIS_PORT || '6379'));
  }

  get<T = any>(key: string, defaultValue?: T): T {
    return this.config.get(key) ?? defaultValue;
  }

  set(key: string, value: any): void {
    this.config.set(key, value);
  }

  has(key: string): boolean {
    return this.config.has(key);
  }

  getAll(): Record<string, any> {
    return Object.fromEntries(this.config);
  }
}

/**
 * Logger Singleton
 */
export class Logger {
  private static instance: Logger;
  private logLevel: 'debug' | 'info' | 'warn' | 'error';

  private constructor() {
    this.logLevel = (process.env.LOG_LEVEL as any) || 'info';
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  debug(message: string, meta?: any): void {
    if (this.shouldLog('debug')) {
      logger.debug(message, meta);
    }
  }

  info(message: string, meta?: any): void {
    if (this.shouldLog('info')) {
      logger.info(message, meta);
    }
  }

  warn(message: string, meta?: any): void {
    if (this.shouldLog('warn')) {
      logger.warn(message, meta);
    }
  }

  error(message: string, meta?: any): void {
    if (this.shouldLog('error')) {
      logger.error(message, meta);
    }
  }

  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  setLevel(level: Logger['logLevel']): void {
    this.logLevel = level;
  }
}

/**
 * Cache Manager Singleton
 */
export class CacheManager {
  private static instance: CacheManager;
  private cache: Map<string, { value: any; expiresAt: number }>;

  private constructor() {
    this.cache = new Map();
    this.startCleanupTimer();
  }

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  set(key: string, value: any, ttl: number = 3600): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl * 1000,
    });
  }

  get<T = any>(key: string): T | null {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    if (item.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  private startCleanupTimer(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, item] of this.cache.entries()) {
        if (item.expiresAt < now) {
          this.cache.delete(key);
        }
      }
    }, 60000); // Every minute
  }
}

/**
 * Thread-Safe Singleton (for multi-threaded environments)
 */
export class ThreadSafeSingleton {
  private static instance: ThreadSafeSingleton;
  private static lock = false;

  private constructor() {}

  static getInstance(): ThreadSafeSingleton {
    if (!ThreadSafeSingleton.instance) {
      // Wait for lock
      while (ThreadSafeSingleton.lock) {
        // Spin wait
      }

      ThreadSafeSingleton.lock = true;

      if (!ThreadSafeSingleton.instance) {
        ThreadSafeSingleton.instance = new ThreadSafeSingleton();
      }

      ThreadSafeSingleton.lock = false;
    }

    return ThreadSafeSingleton.instance;
  }
}

export default ConfigManager;
