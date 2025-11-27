/**
 * Cash Drawer Hardware Controller
 * Purpose: Low-level control of cash drawer hardware
 * Description: Serial/USB communication, status monitoring
 */

import { logger } from '@/lib/logger';
import { EventEmitter } from 'events';

export interface DrawerStatus {
  is_open: boolean;
  last_opened: Date | null;
  open_count: number;
  connection_status: 'connected' | 'disconnected' | 'error';
}

export class CashDrawerHardwareController extends EventEmitter {
  private drawerId: string;
  private isOpen: boolean = false;
  private openCount: number = 0;
  private lastOpened: Date | null = null;
  private connectionStatus: 'connected' | 'disconnected' | 'error' = 'disconnected';
  private device?: any;

  // ESC/POS command to open drawer (pulse pin 2)
  private readonly OPEN_COMMAND = new Uint8Array([0x1B, 0x70, 0x00, 0x19, 0xFA]);

  // Alternative command (pulse pin 5)
  private readonly OPEN_COMMAND_ALT = new Uint8Array([0x1B, 0x70, 0x01, 0x19, 0xFA]);

  constructor(drawerId: string) {
    super();
    this.drawerId = drawerId;
  }

  /**
   * Connect to cash drawer
   */
  async connect(): Promise<void> {
    logger.info('Connecting to cash drawer', { drawer_id: this.drawerId });

    try {
      // Try USB connection first
      await this.connectUSB();
    } catch (error) {
      logger.warn('USB connection failed, trying serial', { error });

      try {
        // Fallback to serial
        await this.connectSerial();
      } catch (serialError) {
        logger.error('All connection methods failed', { serialError });
        this.connectionStatus = 'error';
        throw new Error('Failed to connect to cash drawer');
      }
    }

    this.connectionStatus = 'connected';
    this.emit('connected');

    // Start monitoring drawer status
    this.startStatusMonitoring();

    logger.info('Cash drawer connected');
  }

  /**
   * Connect via USB
   */
  private async connectUSB(): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.usb) {
      throw new Error('WebUSB not supported');
    }

    // Request USB device (typically connected via receipt printer)
    this.device = await navigator.usb.requestDevice({
      filters: [
        { vendorId: 0x04b8 }, // Epson
        { vendorId: 0x0519 }, // Star Micronics
        { vendorId: 0x0fe6 }, // ICS Advent
      ],
    });

    await this.device.open();
    await this.device.selectConfiguration(1);
    await this.device.claimInterface(0);

    logger.info('USB connection established', {
      vendor_id: this.device.vendorId,
      product_id: this.device.productId,
    });
  }

  /**
   * Connect via Serial
   */
  private async connectSerial(): Promise<void> {
    if (typeof navigator === 'undefined' || !(navigator as any).serial) {
      throw new Error('Web Serial API not supported');
    }

    // Request serial port
    const port = await (navigator as any).serial.requestPort();
    await port.open({ baudRate: 9600 });

    this.device = port;

    logger.info('Serial connection established');
  }

  /**
   * Disconnect from cash drawer
   */
  async disconnect(): Promise<void> {
    logger.info('Disconnecting cash drawer');

    if (this.device) {
      try {
        if (this.device.close) {
          await this.device.close();
        }
      } catch (error) {
        logger.error('Error disconnecting drawer', { error });
      }
    }

    this.connectionStatus = 'disconnected';
    this.emit('disconnected');
  }

  /**
   * Open drawer
   */
  async open(): Promise<void> {
    if (this.connectionStatus !== 'connected') {
      throw new Error('Drawer not connected');
    }

    logger.info('Opening cash drawer', { drawer_id: this.drawerId });

    try {
      // Send open command
      await this.sendCommand(this.OPEN_COMMAND);

      // Update status
      this.isOpen = true;
      this.openCount++;
      this.lastOpened = new Date();

      this.emit('opened', {
        drawer_id: this.drawerId,
        timestamp: this.lastOpened,
      });

      // Auto-detect when drawer closes
      setTimeout(() => {
        this.checkDrawerClosed();
      }, 5000);

      logger.info('Cash drawer opened successfully');
    } catch (error) {
      logger.error('Failed to open drawer', { error });
      throw error;
    }
  }

  /**
   * Check if drawer is closed
   */
  private async checkDrawerClosed(): Promise<void> {
    // In real implementation, check hardware status
    // For now, assume closed after timeout
    if (this.isOpen) {
      this.isOpen = false;
      this.emit('closed', {
        drawer_id: this.drawerId,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Send command to drawer
   */
  private async sendCommand(command: Uint8Array): Promise<void> {
    if (!this.device) {
      throw new Error('No device connection');
    }

    try {
      if (this.device.transferOut) {
        // USB device
        await this.device.transferOut(1, command);
      } else if (this.device.writable) {
        // Serial device
        const writer = this.device.writable.getWriter();
        await writer.write(command);
        writer.releaseLock();
      } else {
        throw new Error('Unsupported device type');
      }
    } catch (error) {
      logger.error('Failed to send command', { error });
      throw error;
    }
  }

  /**
   * Get drawer status
   */
  getStatus(): DrawerStatus {
    return {
      is_open: this.isOpen,
      last_opened: this.lastOpened,
      open_count: this.openCount,
      connection_status: this.connectionStatus,
    };
  }

  /**
   * Start monitoring drawer status
   */
  private startStatusMonitoring(): void {
    // Poll drawer status every second
    const intervalId = setInterval(() => {
      if (this.connectionStatus !== 'connected') {
        clearInterval(intervalId);
        return;
      }

      // Check connection health
      this.checkConnectionHealth();
    }, 1000);

    // Store interval for cleanup
    (this as any).statusInterval = intervalId;
  }

  /**
   * Check connection health
   */
  private async checkConnectionHealth(): Promise<void> {
    try {
      // Send status query command
      // In real implementation, check device status
      if (!this.device) {
        this.connectionStatus = 'disconnected';
        this.emit('connection_lost');
      }
    } catch (error) {
      logger.error('Connection health check failed', { error });
      this.connectionStatus = 'error';
      this.emit('connection_error', error);
    }
  }

  /**
   * Test drawer
   */
  async test(): Promise<boolean> {
    logger.info('Testing cash drawer');

    try {
      await this.open();
      return true;
    } catch (error) {
      logger.error('Drawer test failed', { error });
      return false;
    }
  }

  /**
   * Reset open counter
   */
  resetCounter(): void {
    this.openCount = 0;
    logger.info('Drawer open counter reset');
  }
}

export default CashDrawerHardwareController;
