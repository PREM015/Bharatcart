/**
 * Card Reader Integration
 * Purpose: Process card payments via hardware readers
 * Description: EMV chip, contactless, magnetic stripe support
 */

import { logger } from '@/lib/logger';
import { EventEmitter } from 'events';
import { prisma } from '@/lib/prisma';

export interface CardTransaction {
  amount: number;
  currency: string;
  card_type: 'credit' | 'debit' | 'gift_card';
  entry_method: 'chip' | 'contactless' | 'swipe' | 'manual';
  last_four: string;
  card_brand: string;
  approval_code?: string;
  reference_number?: string;
}

export interface PaymentResult {
  success: boolean;
  transaction_id?: string;
  approval_code?: string;
  error?: string;
  receipt_data?: any;
}

export class CardReader extends EventEmitter {
  private deviceId: string;
  private isConnected: boolean = false;
  private currentTransaction?: any;

  constructor(deviceId: string) {
    super();
    this.deviceId = deviceId;
  }

  /**
   * Connect to card reader
   */
  async connect(): Promise<void> {
    logger.info('Connecting to card reader', { device_id: this.deviceId });

    try {
      // Initialize connection (WebUSB, Bluetooth, or serial)
      await this.initializeDevice();

      this.isConnected = true;
      this.emit('connected');

      logger.info('Card reader connected successfully');
    } catch (error) {
      logger.error('Failed to connect to card reader', { error });
      throw error;
    }
  }

  /**
   * Disconnect from card reader
   */
  async disconnect(): Promise<void> {
    logger.info('Disconnecting card reader');

    this.isConnected = false;
    this.emit('disconnected');
  }

  /**
   * Process payment
   */
  async processPayment(
    amount: number,
    currency: string = 'USD',
    metadata?: any
  ): Promise<PaymentResult> {
    if (!this.isConnected) {
      throw new Error('Card reader not connected');
    }

    logger.info('Processing card payment', {
      amount,
      currency,
      device_id: this.deviceId,
    });

    try {
      // Start transaction
      this.currentTransaction = {
        amount,
        currency,
        started_at: new Date(),
        status: 'PENDING',
      };

      this.emit('transaction_started', this.currentTransaction);

      // Prompt for card
      this.emit('prompt_card', { message: 'Insert, tap, or swipe card' });

      // Wait for card input
      const cardData = await this.waitForCard();

      this.emit('card_detected', {
        entry_method: cardData.entry_method,
        card_brand: cardData.card_brand,
      });

      // Read card data
      const cardInfo = await this.readCard(cardData);

      // Validate card
      if (!this.validateCard(cardInfo)) {
        throw new Error('Invalid card data');
      }

      // Process with payment processor
      this.emit('processing', { message: 'Processing payment...' });

      const result = await this.sendToProcessor({
        amount: Math.round(amount * 100),
        currency,
        card_info: cardInfo,
        entry_method: cardData.entry_method,
        metadata,
      });

      if (result.approved) {
        // Successful payment
        this.emit('approved', result);

        // Save transaction
        const transaction = await this.saveTransaction({
          amount,
          currency,
          card_type: cardInfo.card_type,
          entry_method: cardData.entry_method,
          last_four: cardInfo.last_four,
          card_brand: cardInfo.card_brand,
          approval_code: result.approval_code,
          reference_number: result.reference_number,
        });

        logger.info('Payment approved', {
          transaction_id: transaction.id,
          approval_code: result.approval_code,
        });

        return {
          success: true,
          transaction_id: transaction.id.toString(),
          approval_code: result.approval_code,
          receipt_data: result.receipt_data,
        };
      } else {
        // Declined
        this.emit('declined', result);

        logger.warn('Payment declined', {
          reason: result.decline_reason,
        });

        return {
          success: false,
          error: result.decline_reason || 'Payment declined',
        };
      }
    } catch (error: any) {
      logger.error('Payment processing error', { error });

      this.emit('error', error);

      return {
        success: false,
        error: error.message,
      };
    } finally {
      this.currentTransaction = null;
    }
  }

  /**
   * Process refund
   */
  async processRefund(
    originalTransactionId: string,
    amount: number,
    reason: string
  ): Promise<PaymentResult> {
    logger.info('Processing refund', {
      original_transaction: originalTransactionId,
      amount,
    });

    try {
      // Get original transaction
      const original = await prisma.cardTransaction.findUnique({
        where: { id: parseInt(originalTransactionId) },
      });

      if (!original) {
        throw new Error('Original transaction not found');
      }

      if (amount > original.amount) {
        throw new Error('Refund amount exceeds original transaction');
      }

      // Send refund to processor
      const result = await this.sendRefundToProcessor({
        original_reference: original.reference_number,
        amount: Math.round(amount * 100),
        reason,
      });

      if (result.approved) {
        // Save refund transaction
        await prisma.cardTransaction.create({
          data: {
            type: 'REFUND',
            amount: Math.round(amount * 100),
            currency: original.currency,
            card_type: original.card_type,
            entry_method: 'MANUAL',
            last_four: original.last_four,
            card_brand: original.card_brand,
            approval_code: result.approval_code,
            reference_number: result.reference_number,
            original_transaction_id: original.id,
            status: 'APPROVED',
            processed_at: new Date(),
          },
        });

        return {
          success: true,
          approval_code: result.approval_code,
        };
      } else {
        return {
          success: false,
          error: result.decline_reason,
        };
      }
    } catch (error: any) {
      logger.error('Refund processing error', { error });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Cancel current transaction
   */
  async cancelTransaction(): Promise<void> {
    if (this.currentTransaction) {
      logger.info('Cancelling transaction');

      this.emit('cancelled');
      this.currentTransaction = null;
    }
  }

  /**
   * Initialize device connection
   */
  private async initializeDevice(): Promise<void> {
    // Implementation depends on device type
    // Could use WebUSB, Web Bluetooth, or serial connection

    // Example for WebUSB
    if (typeof navigator !== 'undefined' && navigator.usb) {
      const device = await navigator.usb.requestDevice({
        filters: [
          { vendorId: 0x0bda }, // Example vendor ID
        ],
      });

      await device.open();
      await device.selectConfiguration(1);
      await device.claimInterface(0);

      // Store device reference
      (this as any).usbDevice = device;
    }
  }

  /**
   * Wait for card insertion/tap/swipe
   */
  private async waitForCard(): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Card read timeout'));
      }, 60000); // 60 second timeout

      // Simulate card detection
      // In real implementation, listen to device events
      setTimeout(() => {
        clearTimeout(timeout);
        resolve({
          entry_method: 'chip',
          card_brand: 'VISA',
          detected_at: new Date(),
        });
      }, 2000);
    });
  }

  /**
   * Read card data
   */
  private async readCard(cardData: any): Promise<any> {
    // EMV chip read
    if (cardData.entry_method === 'chip') {
      return await this.readEMVChip();
    }

    // Contactless (NFC)
    if (cardData.entry_method === 'contactless') {
      return await this.readContactless();
    }

    // Magnetic stripe
    if (cardData.entry_method === 'swipe') {
      return await this.readMagStripe();
    }

    throw new Error('Unsupported entry method');
  }

  /**
   * Read EMV chip
   */
  private async readEMVChip(): Promise<any> {
    logger.debug('Reading EMV chip');

    // Send APDU commands to chip
    // This is simplified - real EMV is complex

    return {
      card_type: 'credit',
      card_brand: 'VISA',
      last_four: '4242',
      cardholder_name: 'CARDHOLDER',
      expiry_month: 12,
      expiry_year: 2025,
      encrypted_data: 'encrypted_emv_data',
    };
  }

  /**
   * Read contactless (NFC)
   */
  private async readContactless(): Promise<any> {
    logger.debug('Reading contactless card');

    return {
      card_type: 'credit',
      card_brand: 'MASTERCARD',
      last_four: '5555',
      encrypted_data: 'encrypted_nfc_data',
    };
  }

  /**
   * Read magnetic stripe
   */
  private async readMagStripe(): Promise<any> {
    logger.debug('Reading magnetic stripe');

    // Parse track data
    // Track 1 and Track 2 data

    return {
      card_type: 'credit',
      card_brand: 'AMEX',
      last_four: '0005',
      cardholder_name: 'CARDHOLDER',
      expiry_month: 12,
      expiry_year: 2025,
      encrypted_data: 'encrypted_track_data',
    };
  }

  /**
   * Validate card data
   */
  private validateCard(cardInfo: any): boolean {
    // Check required fields
    if (!cardInfo.card_brand || !cardInfo.last_four) {
      return false;
    }

    // Validate expiry (if present)
    if (cardInfo.expiry_month && cardInfo.expiry_year) {
      const now = new Date();
      const expiry = new Date(cardInfo.expiry_year, cardInfo.expiry_month - 1);

      if (expiry < now) {
        logger.warn('Card expired');
        return false;
      }
    }

    return true;
  }

  /**
   * Send to payment processor
   */
  private async sendToProcessor(data: any): Promise<any> {
    // Integration with payment processor (Stripe, Square, etc.)
    // This is a simplified mock

    logger.debug('Sending to payment processor', {
      amount: data.amount,
      entry_method: data.entry_method,
    });

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock approval
    return {
      approved: true,
      approval_code: `APP${Date.now().toString().slice(-6)}`,
      reference_number: `REF${Date.now()}`,
      receipt_data: {
        merchant: 'Your Store',
        terminal: this.deviceId,
        card_brand: data.card_info.card_brand,
        last_four: data.card_info.last_four,
        entry_method: data.entry_method,
        amount: data.amount / 100,
      },
    };
  }

  /**
   * Send refund to processor
   */
  private async sendRefundToProcessor(data: any): Promise<any> {
    logger.debug('Sending refund to processor', {
      amount: data.amount,
      original: data.original_reference,
    });

    await new Promise(resolve => setTimeout(resolve, 1500));

    return {
      approved: true,
      approval_code: `REF${Date.now().toString().slice(-6)}`,
      reference_number: `REFUND${Date.now()}`,
    };
  }

  /**
   * Save transaction to database
   */
  private async saveTransaction(data: CardTransaction): Promise<any> {
    return await prisma.cardTransaction.create({
      data: {
        type: 'SALE',
        amount: Math.round(data.amount * 100),
        currency: data.currency,
        card_type: data.card_type,
        entry_method: data.entry_method,
        last_four: data.last_four,
        card_brand: data.card_brand,
        approval_code: data.approval_code,
        reference_number: data.reference_number,
        status: 'APPROVED',
        processed_at: new Date(),
      },
    });
  }

  /**
   * Get reader status
   */
  async getStatus(): Promise<any> {
    return {
      device_id: this.deviceId,
      connected: this.isConnected,
      ready: this.isConnected && !this.currentTransaction,
      busy: !!this.currentTransaction,
    };
  }

  /**
   * Test reader connection
   */
  async testConnection(): Promise<boolean> {
    try {
      // Send test command to device
      this.emit('test', { status: 'testing' });

      await new Promise(resolve => setTimeout(resolve, 1000));

      this.emit('test', { status: 'ok' });

      return true;
    } catch (error) {
      logger.error('Reader test failed', { error });
      return false;
    }
  }
}

export default CardReader;
