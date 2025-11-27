/**
 * Register Management System
 * Purpose: Manage POS registers/terminals
 * Description: Register configuration, status tracking, multi-register support
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { EventEmitter } from 'events';

export interface Register {
  id: number;
  name: string;
  location: string;
  terminal_id: string;
  status: 'active' | 'inactive' | 'maintenance' | 'offline';
  current_shift?: number;
  current_user?: number;
  hardware_config: {
    printer?: string;
    scanner?: string;
    card_reader?: string;
    cash_drawer?: string;
    display?: string;
  };
  settings: {
    allow_offline: boolean;
    require_cash_management: boolean;
    auto_print_receipts: boolean;
    customer_display_enabled: boolean;
  };
}

export interface RegisterStats {
  total_transactions: number;
  total_sales: number;
  total_refunds: number;
  average_transaction: number;
  current_shift_sales: number;
  uptime_percentage: number;
}

export class RegisterManagement extends EventEmitter {
  private registerId: number;
  private register?: Register;

  constructor(registerId: number) {
    super();
    this.registerId = registerId;
  }

  /**
   * Initialize register
   */
  async initialize(): Promise<Register> {
    logger.info('Initializing register', { register_id: this.registerId });

    const register = await prisma.register.findUnique({
      where: { id: this.registerId },
      include: {
        current_shift: true,
        current_user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!register) {
      throw new Error('Register not found');
    }

    this.register = {
      id: register.id,
      name: register.name,
      location: register.location,
      terminal_id: register.terminal_id,
      status: register.status as any,
      current_shift: register.current_shift?.id,
      current_user: register.current_user?.id,
      hardware_config: register.hardware_config 
        ? JSON.parse(register.hardware_config as string)
        : {},
      settings: register.settings 
        ? JSON.parse(register.settings as string)
        : this.getDefaultSettings(),
    };

    // Start heartbeat
    this.startHeartbeat();

    // Check hardware
    await this.checkHardware();

    this.emit('initialized', this.register);

    logger.info('Register initialized', {
      register_id: this.registerId,
      status: this.register.status,
    });

    return this.register;
  }

  /**
   * Create new register
   */
  static async createRegister(data: {
    name: string;
    location: string;
    terminal_id: string;
    hardware_config?: any;
    settings?: any;
  }): Promise<Register> {
    logger.info('Creating new register', { name: data.name });

    const register = await prisma.register.create({
      data: {
        name: data.name,
        location: data.location,
        terminal_id: data.terminal_id,
        status: 'INACTIVE',
        hardware_config: JSON.stringify(data.hardware_config || {}),
        settings: JSON.stringify(data.settings || {}),
        created_at: new Date(),
      },
    });

    return {
      id: register.id,
      name: register.name,
      location: register.location,
      terminal_id: register.terminal_id,
      status: 'inactive',
      hardware_config: data.hardware_config || {},
      settings: data.settings || {},
    };
  }

  /**
   * Update register status
   */
  async updateStatus(
    status: 'active' | 'inactive' | 'maintenance' | 'offline',
    reason?: string
  ): Promise<void> {
    logger.info('Updating register status', {
      register_id: this.registerId,
      status,
      reason,
    });

    await prisma.register.update({
      where: { id: this.registerId },
      data: {
        status: status.toUpperCase(),
        status_reason: reason,
        status_updated_at: new Date(),
      },
    });

    if (this.register) {
      this.register.status = status;
    }

    this.emit('status_changed', { status, reason });

    // Log status change
    await prisma.registerStatusLog.create({
      data: {
        register_id: this.registerId,
        status: status.toUpperCase(),
        reason,
        created_at: new Date(),
      },
    });
  }

  /**
   * Assign user to register
   */
  async assignUser(userId: number): Promise<void> {
    logger.info('Assigning user to register', {
      register_id: this.registerId,
      user_id: userId,
    });

    await prisma.register.update({
      where: { id: this.registerId },
      data: {
        current_user_id: userId,
        last_user_assigned_at: new Date(),
      },
    });

    if (this.register) {
      this.register.current_user = userId;
    }

    this.emit('user_assigned', { user_id: userId });
  }

  /**
   * Unassign user from register
   */
  async unassignUser(): Promise<void> {
    logger.info('Unassigning user from register', {
      register_id: this.registerId,
    });

    await prisma.register.update({
      where: { id: this.registerId },
      data: {
        current_user_id: null,
      },
    });

    if (this.register) {
      this.register.current_user = undefined;
    }

    this.emit('user_unassigned');
  }

  /**
   * Update hardware configuration
   */
  async updateHardwareConfig(config: Partial<Register['hardware_config']>): Promise<void> {
    logger.info('Updating hardware configuration', {
      register_id: this.registerId,
    });

    const currentConfig = this.register?.hardware_config || {};
    const newConfig = { ...currentConfig, ...config };

    await prisma.register.update({
      where: { id: this.registerId },
      data: {
        hardware_config: JSON.stringify(newConfig),
      },
    });

    if (this.register) {
      this.register.hardware_config = newConfig;
    }

    this.emit('hardware_config_updated', newConfig);
  }

  /**
   * Update register settings
   */
  async updateSettings(settings: Partial<Register['settings']>): Promise<void> {
    logger.info('Updating register settings', {
      register_id: this.registerId,
    });

    const currentSettings = this.register?.settings || this.getDefaultSettings();
    const newSettings = { ...currentSettings, ...settings };

    await prisma.register.update({
      where: { id: this.registerId },
      data: {
        settings: JSON.stringify(newSettings),
      },
    });

    if (this.register) {
      this.register.settings = newSettings;
    }

    this.emit('settings_updated', newSettings);
  }

  /**
   * Get register statistics
   */
  async getStatistics(period: 'today' | 'week' | 'month' = 'today'): Promise<RegisterStats> {
    const startDate = this.getStartDate(period);

    const transactions = await prisma.transaction.findMany({
      where: {
        register_id: this.registerId,
        created_at: { gte: startDate },
      },
    });

    const sales = transactions.filter(t => t.type === 'SALE');
    const refunds = transactions.filter(t => t.type === 'REFUND');

    const totalSales = sales.reduce((sum, t) => sum + t.total, 0);
    const totalRefunds = refunds.reduce((sum, t) => sum + t.total, 0);

    const currentShiftSales = this.register?.current_shift
      ? await this.getCurrentShiftSales()
      : 0;

    const uptime = await this.calculateUptime(startDate);

    return {
      total_transactions: transactions.length,
      total_sales: totalSales / 100,
      total_refunds: totalRefunds / 100,
      average_transaction: sales.length > 0 ? totalSales / sales.length / 100 : 0,
      current_shift_sales: currentShiftSales / 100,
      uptime_percentage: uptime,
    };
  }

  /**
   * Check hardware status
   */
  async checkHardware(): Promise<{
    printer: boolean;
    scanner: boolean;
    card_reader: boolean;
    cash_drawer: boolean;
  }> {
    logger.info('Checking hardware status', { register_id: this.registerId });

    const status = {
      printer: false,
      scanner: false,
      card_reader: false,
      cash_drawer: false,
    };

    // Check each hardware component
    // In real implementation, ping each device
    
    if (this.register?.hardware_config.printer) {
      status.printer = true; // Simulate check
    }

    if (this.register?.hardware_config.scanner) {
      status.scanner = true;
    }

    if (this.register?.hardware_config.card_reader) {
      status.card_reader = true;
    }

    if (this.register?.hardware_config.cash_drawer) {
      status.cash_drawer = true;
    }

    this.emit('hardware_status', status);

    return status;
  }

  /**
   * Start heartbeat to track online status
   */
  private startHeartbeat(): void {
    setInterval(async () => {
      try {
        await prisma.register.update({
          where: { id: this.registerId },
          data: {
            last_heartbeat: new Date(),
          },
        });

        this.emit('heartbeat');
      } catch (error) {
        logger.error('Heartbeat failed', {
          register_id: this.registerId,
          error,
        });
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Get current shift sales
   */
  private async getCurrentShiftSales(): Promise<number> {
    if (!this.register?.current_shift) return 0;

    const transactions = await prisma.transaction.findMany({
      where: {
        shift_id: this.register.current_shift,
        type: 'SALE',
      },
    });

    return transactions.reduce((sum, t) => sum + t.total, 0);
  }

  /**
   * Calculate uptime percentage
   */
  private async calculateUptime(since: Date): Promise<number> {
    const logs = await prisma.registerStatusLog.findMany({
      where: {
        register_id: this.registerId,
        created_at: { gte: since },
      },
      orderBy: { created_at: 'asc' },
    });

    if (logs.length === 0) return 100;

    let activeTime = 0;
    const totalTime = Date.now() - since.getTime();

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      const nextLog = logs[i + 1];

      if (log.status === 'ACTIVE') {
        const endTime = nextLog ? nextLog.created_at.getTime() : Date.now();
        activeTime += endTime - log.created_at.getTime();
      }
    }

    return (activeTime / totalTime) * 100;
  }

  /**
   * Get start date for period
   */
  private getStartDate(period: 'today' | 'week' | 'month'): Date {
    const now = new Date();

    switch (period) {
      case 'today':
        return new Date(now.setHours(0, 0, 0, 0));
      case 'week':
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return weekAgo;
      case 'month':
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return monthAgo;
      default:
        return new Date(now.setHours(0, 0, 0, 0));
    }
  }

  /**
   * Get default settings
   */
  private getDefaultSettings(): Register['settings'] {
    return {
      allow_offline: true,
      require_cash_management: true,
      auto_print_receipts: true,
      customer_display_enabled: false,
    };
  }

  /**
   * Get register info
   */
  getRegister(): Register | undefined {
    return this.register;
  }

  /**
   * Lock register
   */
  async lock(reason: string): Promise<void> {
    logger.info('Locking register', {
      register_id: this.registerId,
      reason,
    });

    await this.updateStatus('maintenance', reason);
    this.emit('locked', { reason });
  }

  /**
   * Unlock register
   */
  async unlock(): Promise<void> {
    logger.info('Unlocking register', { register_id: this.registerId });

    await this.updateStatus('active', 'Unlocked');
    this.emit('unlocked');
  }

  /**
   * Get all registers
   */
  static async getAllRegisters(location?: string): Promise<Register[]> {
    const where = location ? { location } : {};

    const registers = await prisma.register.findMany({
      where,
      include: {
        current_shift: true,
        current_user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return registers.map(reg => ({
      id: reg.id,
      name: reg.name,
      location: reg.location,
      terminal_id: reg.terminal_id,
      status: reg.status.toLowerCase() as any,
      current_shift: reg.current_shift?.id,
      current_user: reg.current_user?.id,
      hardware_config: reg.hardware_config 
        ? JSON.parse(reg.hardware_config as string)
        : {},
      settings: reg.settings 
        ? JSON.parse(reg.settings as string)
        : {},
    }));
  }
}

export default RegisterManagement;
