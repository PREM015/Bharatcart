/**
 * Exchange Transaction Processing
 * Purpose: Process product exchanges at POS
 * Description: Exchange validation, price adjustments, combined return+sale
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { EventEmitter } from 'events';
import { ReturnTransactionProcessor } from './return-transaction';
import { SaleTransactionProcessor } from './sale-transaction';
import { ReceiptPrinter } from '../hardware/receipt-printer';

export interface ExchangeItem {
  // Original item being returned
  return_item: {
    transaction_item_id: number;
    product_id: number;
    variant_id?: number;
    name: string;
    quantity: number;
    original_price: number;
    return_reason: string;
    condition: 'new' | 'opened' | 'damaged' | 'defective';
  };
  // New item being exchanged for
  exchange_for: {
    product_id: number;
    variant_id?: number;
    name: string;
    sku: string;
    quantity: number;
    price: number;
  };
}

export interface ExchangeTransaction {
  id?: number;
  register_id: number;
  shift_id: number;
  cashier_id: number;
  original_transaction_id: number;
  customer_id?: number;
  exchanges: ExchangeItem[];
  return_total: number;
  new_total: number;
  price_difference: number;
  payment_required: boolean;
  refund_due: boolean;
  status: 'pending' | 'completed' | 'cancelled';
  created_at: Date;
}

export class ExchangeTransactionProcessor extends EventEmitter {
  private registerId: number;
  private shiftId: number;
  private cashierId: number;
  private exchanges: ExchangeItem[] = [];
  private originalTransaction?: any;
  private returnProcessor: ReturnTransactionProcessor;
  private saleProcessor: SaleTransactionProcessor;
  private printer: ReceiptPrinter;

  constructor(
    registerId: number,
    shiftId: number,
    cashierId: number,
    drawerId: number,
    printerName: string = 'default'
  ) {
    super();
    this.registerId = registerId;
    this.shiftId = shiftId;
    this.cashierId = cashierId;
    this.returnProcessor = new ReturnTransactionProcessor(
      registerId,
      shiftId,
      cashierId,
      printerName
    );
    this.saleProcessor = new SaleTransactionProcessor(
      registerId,
      shiftId,
      cashierId,
      printerName
    );
    this.printer = new ReceiptPrinter(printerName);
  }

  /**
   * Look up original transaction
   */
  async lookupTransaction(
    transactionId?: number,
    receiptNumber?: string
  ): Promise<any> {
    logger.info('Looking up transaction for exchange', {
      transaction_id: transactionId,
      receipt_number: receiptNumber,
    });

    const transaction = await this.returnProcessor.lookupTransaction(
      transactionId,
      receiptNumber
    );

    this.originalTransaction = transaction;
    this.emit('transaction_found', transaction);

    return transaction;
  }

  /**
   * Add exchange pair
   */
  async addExchange(exchange: ExchangeItem): Promise<void> {
    if (!this.originalTransaction) {
      throw new Error('Original transaction not loaded');
    }

    logger.info('Adding exchange', {
      return_product: exchange.return_item.product_id,
      exchange_product: exchange.exchange_for.product_id,
    });

    // Validate return item
    const originalItem = this.originalTransaction.items.find(
      (item: any) => item.id === exchange.return_item.transaction_item_id
    );

    if (!originalItem) {
      throw new Error('Return item not found in original transaction');
    }

    if (exchange.return_item.quantity > originalItem.quantity) {
      throw new Error('Exchange quantity exceeds original quantity');
    }

    // Validate exchange item is available
    const exchangeProduct = await prisma.product.findUnique({
      where: { id: exchange.exchange_for.product_id },
      include: { inventory: true },
    });

    if (!exchangeProduct) {
      throw new Error('Exchange product not found');
    }

    if (
      exchangeProduct.inventory &&
      exchangeProduct.inventory.quantity < exchange.exchange_for.quantity
    ) {
      throw new Error('Insufficient inventory for exchange product');
    }

    // Check if exchanging same product (size/color change)
    const isSameProduct = exchange.return_item.product_id === exchange.exchange_for.product_id;
    const isDifferentVariant = exchange.return_item.variant_id !== exchange.exchange_for.variant_id;

    if (isSameProduct && isDifferentVariant) {
      logger.info('Even exchange - variant change', {
        original_variant: exchange.return_item.variant_id,
        new_variant: exchange.exchange_for.variant_id,
      });
    }

    this.exchanges.push(exchange);

    this.emit('exchange_added', exchange);
    this.emit('exchanges_updated', this.exchanges);
  }

  /**
   * Remove exchange
   */
  removeExchange(index: number): void {
    if (index >= 0 && index < this.exchanges.length) {
      const exchange = this.exchanges.splice(index, 1)[0];
      this.emit('exchange_removed', exchange);
      this.emit('exchanges_updated', this.exchanges);
    }
  }

  /**
   * Calculate exchange totals
   */
  calculateTotals(): {
    return_total: number;
    new_total: number;
    price_difference: number;
    payment_required: boolean;
    refund_due: boolean;
  } {
    const returnTotal = this.exchanges.reduce((sum, ex) => {
      return sum + ex.return_item.original_price * ex.return_item.quantity;
    }, 0);

    const newTotal = this.exchanges.reduce((sum, ex) => {
      return sum + ex.exchange_for.price * ex.exchange_for.quantity;
    }, 0);

    const priceDifference = newTotal - returnTotal;

    return {
      return_total: returnTotal,
      new_total: newTotal,
      price_difference: Math.abs(priceDifference),
      payment_required: priceDifference > 0,
      refund_due: priceDifference < 0,
    };
  }

  /**
   * Process exchange
   */
  async processExchange(
    paymentMethod?: 'cash' | 'card',
    amountTendered?: number
  ): Promise<ExchangeTransaction> {
    if (!this.originalTransaction) {
      throw new Error('Original transaction not loaded');
    }

    if (this.exchanges.length === 0) {
      throw new Error('No exchanges added');
    }

    logger.info('Processing exchange transaction');

    const totals = this.calculateTotals();

    // Handle payment/refund if there's a price difference
    let paymentDetails: any = {};

    if (totals.payment_required) {
      // Customer needs to pay difference
      if (!paymentMethod) {
        throw new Error('Payment method required for price difference');
      }

      if (paymentMethod === 'cash') {
        if (!amountTendered || amountTendered < totals.price_difference) {
          throw new Error('Insufficient payment amount');
        }
        paymentDetails = {
          method: 'cash',
          amount_tendered: amountTendered,
          change: amountTendered - totals.price_difference,
        };
      } else if (paymentMethod === 'card') {
        // Process card payment for difference
        paymentDetails = {
          method: 'card',
          amount: totals.price_difference,
        };
      }
    } else if (totals.refund_due) {
      // Refund difference to customer
      paymentDetails = {
        method: 'refund',
        amount: totals.price_difference,
      };
    } else {
      // Even exchange
      paymentDetails = {
        method: 'even_exchange',
        amount: 0,
      };
    }

    // Create exchange transaction
    const exchangeTransaction = await this.saveExchange({
      payment_details: paymentDetails,
      status: 'completed',
    });

    // Process inventory changes
    await this.processInventoryChanges();

    // Print receipt
    await this.printExchangeReceipt(exchangeTransaction, paymentDetails);

    // Clear exchanges
    this.clearExchange();

    this.emit('exchange_completed', exchangeTransaction);

    return exchangeTransaction;
  }

  /**
   * Save exchange transaction
   */
  private async saveExchange(data: {
    payment_details: any;
    status: string;
  }): Promise<ExchangeTransaction> {
    const totals = this.calculateTotals();

    // Create main exchange transaction
    const transaction = await prisma.transaction.create({
      data: {
        register_id: this.registerId,
        shift_id: this.shiftId,
        cashier_id: this.cashierId,
        customer_id: this.originalTransaction.customer_id,
        original_transaction_id: this.originalTransaction.id,
        type: 'EXCHANGE',
        subtotal: Math.round(totals.new_total * 100),
        tax: 0,
        discount: 0,
        total: Math.round(totals.price_difference * 100),
        payment_method: data.payment_details.method.toUpperCase(),
        payment_details: JSON.stringify(data.payment_details),
        status: data.status.toUpperCase(),
        created_at: new Date(),
      },
    });

    // Create return items
    for (const exchange of this.exchanges) {
      await prisma.transactionItem.create({
        data: {
          transaction_id: transaction.id,
          product_id: exchange.return_item.product_id,
          variant_id: exchange.return_item.variant_id,
          name: exchange.return_item.name,
          sku: '', // Will be filled from product
          quantity: -exchange.return_item.quantity, // Negative for return
          price: Math.round(exchange.return_item.original_price * 100),
          discount: 0,
          tax_rate: 0,
          total: Math.round(-exchange.return_item.original_price * exchange.return_item.quantity * 100),
          return_reason: exchange.return_item.return_reason,
          return_condition: exchange.return_item.condition,
        },
      });

      // Create exchange items
      await prisma.transactionItem.create({
        data: {
          transaction_id: transaction.id,
          product_id: exchange.exchange_for.product_id,
          variant_id: exchange.exchange_for.variant_id,
          name: exchange.exchange_for.name,
          sku: exchange.exchange_for.sku,
          quantity: exchange.exchange_for.quantity,
          price: Math.round(exchange.exchange_for.price * 100),
          discount: 0,
          tax_rate: 0,
          total: Math.round(exchange.exchange_for.price * exchange.exchange_for.quantity * 100),
        },
      });
    }

    return {
      id: transaction.id,
      register_id: transaction.register_id,
      shift_id: transaction.shift_id,
      cashier_id: transaction.cashier_id,
      original_transaction_id: this.originalTransaction.id,
      customer_id: transaction.customer_id || undefined,
      exchanges: this.exchanges,
      return_total: totals.return_total,
      new_total: totals.new_total,
      price_difference: totals.price_difference,
      payment_required: totals.payment_required,
      refund_due: totals.refund_due,
      status: data.status as any,
      created_at: transaction.created_at,
    };
  }

  /**
   * Process inventory changes
   */
  private async processInventoryChanges(): Promise<void> {
    for (const exchange of this.exchanges) {
      // Return original item to inventory (if condition allows)
      if (
        exchange.return_item.condition === 'new' ||
        exchange.return_item.condition === 'opened'
      ) {
        await prisma.inventory.update({
          where: { product_id: exchange.return_item.product_id },
          data: {
            quantity: {
              increment: exchange.return_item.quantity,
            },
          },
        });
      } else {
        // Log damaged item
        await prisma.damagedInventory.create({
          data: {
            product_id: exchange.return_item.product_id,
            variant_id: exchange.return_item.variant_id,
            quantity: exchange.return_item.quantity,
            condition: exchange.return_item.condition,
            reason: exchange.return_item.return_reason,
            created_at: new Date(),
          },
        });
      }

      // Deduct exchange item from inventory
      await prisma.inventory.update({
        where: { product_id: exchange.exchange_for.product_id },
        data: {
          quantity: {
            decrement: exchange.exchange_for.quantity,
          },
        },
      });
    }
  }

  /**
   * Print exchange receipt
   */
  private async printExchangeReceipt(
    exchangeTx: ExchangeTransaction,
    paymentDetails: any
  ): Promise<void> {
    const register = await prisma.register.findUnique({
      where: { id: this.registerId },
      include: { store: true },
    });

    if (!register) return;

    const items = [];

    // Add returned items
    for (const exchange of this.exchanges) {
      items.push({
        name: `[RETURN] ${exchange.return_item.name}`,
        quantity: exchange.return_item.quantity,
        price: -exchange.return_item.original_price,
        total: -exchange.return_item.original_price * exchange.return_item.quantity,
      });

      // Add new items
      items.push({
        name: `[NEW] ${exchange.exchange_for.name}`,
        quantity: exchange.exchange_for.quantity,
        price: exchange.exchange_for.price,
        total: exchange.exchange_for.price * exchange.exchange_for.quantity,
      });
    }

    await this.printer.printReceipt({
      header: {
        store_name: register.store?.name || 'Store',
        address: [
          register.store?.address_line1 || '',
          register.store?.city || '',
        ],
        phone: register.store?.phone || '',
      },
      transaction: {
        id: `EXCHANGE-${exchangeTx.id}`,
        date: exchangeTx.created_at,
        cashier: exchangeTx.cashier_id.toString(),
        register: register.name,
      },
      items,
      totals: {
        subtotal: exchangeTx.new_total - exchangeTx.return_total,
        tax: 0,
        discount: 0,
        total: exchangeTx.price_difference * (exchangeTx.payment_required ? 1 : -1),
        payment_method: paymentDetails.method,
        amount_paid: paymentDetails.amount_tendered || exchangeTx.price_difference,
        change: paymentDetails.change,
      },
      footer: {
        thank_you: 'Thank you for your exchange!',
        return_policy: `Original Transaction: ${this.originalTransaction.id}`,
      },
    });
  }

  /**
   * Clear exchange
   */
  clearExchange(): void {
    this.exchanges = [];
    this.originalTransaction = undefined;
    this.emit('exchange_cleared');
  }

  /**
   * Get exchanges
   */
  getExchanges(): ExchangeItem[] {
    return [...this.exchanges];
  }

  /**
   * Cancel exchange
   */
  async cancelExchange(): Promise<void> {
    logger.info('Cancelling exchange transaction');

    this.clearExchange();
    this.emit('exchange_cancelled');
  }

  /**
   * Validate exchange eligibility
   */
  async validateExchangeEligibility(): Promise<{
    eligible: boolean;
    reasons: string[];
  }> {
    const reasons: string[] = [];

    if (!this.originalTransaction) {
      return {
        eligible: false,
        reasons: ['Original transaction not loaded'],
      };
    }

    // Check if all exchange items are available
    for (const exchange of this.exchanges) {
      const product = await prisma.product.findUnique({
        where: { id: exchange.exchange_for.product_id },
        include: { inventory: true },
      });

      if (!product) {
        reasons.push(`Product ${exchange.exchange_for.name} not found`);
        continue;
      }

      if (
        product.inventory &&
        product.inventory.quantity < exchange.exchange_for.quantity
      ) {
        reasons.push(
          `Insufficient stock for ${exchange.exchange_for.name} (${product.inventory.quantity} available)`
        );
      }
    }

    return {
      eligible: reasons.length === 0,
      reasons,
    };
  }
}

export default ExchangeTransactionProcessor;
