/**
 * Return Transaction Processing
 * Purpose: Process product returns at POS
 * Description: Return validation, refund processing, inventory restoration
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { EventEmitter } from 'events';
import { ReceiptPrinter } from '../hardware/receipt-printer';
import { CardReader } from '../hardware/card-reader';

export interface ReturnItem {
  transaction_item_id: number;
  product_id: number;
  variant_id?: number;
  name: string;
  sku: string;
  quantity: number;
  original_price: number;
  refund_amount: number;
  return_reason: string;
  condition: 'new' | 'opened' | 'damaged' | 'defective';
}

export interface ReturnTransaction {
  id?: number;
  register_id: number;
  shift_id: number;
  cashier_id: number;
  original_transaction_id: number;
  customer_id?: number;
  items: ReturnItem[];
  subtotal: number;
  tax_refund: number;
  total_refund: number;
  refund_method: 'original_payment' | 'cash' | 'store_credit';
  status: 'pending' | 'completed' | 'rejected';
  created_at: Date;
}

export class ReturnTransactionProcessor extends EventEmitter {
  private registerId: number;
  private shiftId: number;
  private cashierId: number;
  private returnItems: ReturnItem[] = [];
  private originalTransaction?: any;
  private printer: ReceiptPrinter;
  private cardReader?: CardReader;

  // Return policy configuration
  private readonly RETURN_PERIOD_DAYS = 30;
  private readonly RESTOCKING_FEE_PERCENTAGE = 0; // 0% restocking fee

  constructor(
    registerId: number,
    shiftId: number,
    cashierId: number,
    printerName: string = 'default'
  ) {
    super();
    this.registerId = registerId;
    this.shiftId = shiftId;
    this.cashierId = cashierId;
    this.printer = new ReceiptPrinter(printerName);
  }

  /**
   * Look up original transaction
   */
  async lookupTransaction(
    transactionId?: number,
    receiptNumber?: string
  ): Promise<any> {
    logger.info('Looking up original transaction', {
      transaction_id: transactionId,
      receipt_number: receiptNumber,
    });

    const where: any = {};
    if (transactionId) where.id = transactionId;
    if (receiptNumber) where.receipt_number = receiptNumber;

    const transaction = await prisma.transaction.findFirst({
      where,
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
      },
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    // Validate transaction is eligible for return
    await this.validateReturnEligibility(transaction);

    this.originalTransaction = transaction;
    this.emit('transaction_found', transaction);

    return transaction;
  }

  /**
   * Validate return eligibility
   */
  private async validateReturnEligibility(transaction: any): Promise<void> {
    // Check if transaction is within return period
    const transactionDate = new Date(transaction.created_at);
    const daysSince = Math.floor(
      (Date.now() - transactionDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSince > this.RETURN_PERIOD_DAYS) {
      throw new Error(
        `Return period expired. Returns accepted within ${this.RETURN_PERIOD_DAYS} days.`
      );
    }

    // Check if already returned
    const existingReturn = await prisma.transaction.findFirst({
      where: {
        original_transaction_id: transaction.id,
        type: 'RETURN',
        status: { in: ['COMPLETED', 'PENDING'] },
      },
    });

    if (existingReturn) {
      // Check if full return
      const returnedItems = await prisma.transactionItem.findMany({
        where: { transaction_id: existingReturn.id },
      });

      const originalItems = transaction.items;

      const fullyReturned = originalItems.every((origItem: any) => {
        const totalReturned = returnedItems
          .filter(retItem => retItem.product_id === origItem.product_id)
          .reduce((sum, item) => sum + item.quantity, 0);

        return totalReturned >= origItem.quantity;
      });

      if (fullyReturned) {
        throw new Error('This transaction has already been fully returned');
      }
    }

    // Check if transaction was cash/card (store credit can't be returned)
    if (transaction.payment_method === 'STORE_CREDIT') {
      throw new Error('Transactions paid with store credit cannot be returned');
    }
  }

  /**
   * Add item to return
   */
  async addReturnItem(
    itemId: number,
    quantity: number,
    reason: string,
    condition: 'new' | 'opened' | 'damaged' | 'defective'
  ): Promise<void> {
    if (!this.originalTransaction) {
      throw new Error('Original transaction not loaded');
    }

    logger.info('Adding item to return', {
      item_id: itemId,
      quantity,
      reason,
    });

    // Find item in original transaction
    const originalItem = this.originalTransaction.items.find(
      (item: any) => item.id === itemId
    );

    if (!originalItem) {
      throw new Error('Item not found in original transaction');
    }

    // Check if quantity is valid
    if (quantity > originalItem.quantity) {
      throw new Error('Return quantity exceeds original quantity');
    }

    // Check if item already partially returned
    const alreadyReturned = await this.getAlreadyReturnedQuantity(
      this.originalTransaction.id,
      originalItem.product_id
    );

    if (alreadyReturned + quantity > originalItem.quantity) {
      throw new Error(
        `Only ${originalItem.quantity - alreadyReturned} items available for return`
      );
    }

    // Calculate refund amount
    const itemPrice = originalItem.price / 100;
    const itemDiscount = (originalItem.discount || 0) / 100;
    const itemTaxRate = originalItem.tax_rate;
    
    const baseRefund = (itemPrice - itemDiscount) * quantity;
    const restockingFee = condition === 'opened' 
      ? baseRefund * this.RESTOCKING_FEE_PERCENTAGE 
      : 0;
    const refundAmount = baseRefund - restockingFee;

    const returnItem: ReturnItem = {
      transaction_item_id: originalItem.id,
      product_id: originalItem.product_id,
      variant_id: originalItem.variant_id,
      name: originalItem.name,
      sku: originalItem.sku,
      quantity,
      original_price: itemPrice,
      refund_amount: refundAmount,
      return_reason: reason,
      condition,
    };

    this.returnItems.push(returnItem);

    this.emit('return_item_added', returnItem);
    this.emit('return_items_updated', this.returnItems);
  }

  /**
   * Remove item from return
   */
  removeReturnItem(productId: number, variantId?: number): void {
    logger.info('Removing item from return', { product_id: productId });

    const index = this.returnItems.findIndex(
      item => item.product_id === productId && item.variant_id === variantId
    );

    if (index >= 0) {
      const item = this.returnItems.splice(index, 1)[0];
      this.emit('return_item_removed', item);
      this.emit('return_items_updated', this.returnItems);
    }
  }

  /**
   * Get already returned quantity for a product
   */
  private async getAlreadyReturnedQuantity(
    originalTransactionId: number,
    productId: number
  ): Promise<number> {
    const returns = await prisma.transaction.findMany({
      where: {
        original_transaction_id: originalTransactionId,
        type: 'RETURN',
        status: 'COMPLETED',
      },
      include: {
        items: {
          where: { product_id: productId },
        },
      },
    });

    return returns.reduce((total, ret) => {
      return total + ret.items.reduce((sum, item) => sum + item.quantity, 0);
    }, 0);
  }

  /**
   * Calculate return totals
   */
  calculateTotals(): {
    subtotal: number;
    tax_refund: number;
    total_refund: number;
  } {
    const subtotal = this.returnItems.reduce(
      (sum, item) => sum + item.refund_amount,
      0
    );

    // Calculate tax refund proportionally
    const taxRefund = this.returnItems.reduce((sum, item) => {
      const originalItem = this.originalTransaction.items.find(
        (i: any) => i.id === item.transaction_item_id
      );
      if (!originalItem) return sum;

      const itemTax = ((originalItem.price / 100) * item.quantity * originalItem.tax_rate);
      return sum + itemTax;
    }, 0);

    const totalRefund = subtotal + taxRefund;

    return {
      subtotal,
      tax_refund: taxRefund,
      total_refund: totalRefund,
    };
  }

  /**
   * Process return to original payment method
   */
  async processReturnToOriginal(): Promise<ReturnTransaction> {
    if (!this.originalTransaction) {
      throw new Error('Original transaction not loaded');
    }

    logger.info('Processing return to original payment method');

    const totals = this.calculateTotals();
    const originalPaymentMethod = this.originalTransaction.payment_method;

    let refundDetails: any = {};

    // Process refund based on original payment method
    if (originalPaymentMethod === 'CARD') {
      // Process card refund
      if (!this.cardReader) {
        throw new Error('Card reader required for card refunds');
      }

      const refundResult = await this.cardReader.processRefund(
        this.originalTransaction.id.toString(),
        totals.total_refund,
        'Customer return'
      );

      if (!refundResult.success) {
        throw new Error(refundResult.error || 'Card refund failed');
      }

      refundDetails = {
        approval_code: refundResult.approval_code,
        refund_method: 'card',
      };
    } else if (originalPaymentMethod === 'CASH') {
      // Cash refund
      refundDetails = {
        refund_method: 'cash',
        amount: totals.total_refund,
      };
    }

    const returnTransaction = await this.saveReturn({
      refund_method: 'original_payment',
      refund_details: refundDetails,
      status: 'completed',
    });

    // Update inventory
    await this.restoreInventory();

    // Print receipt
    await this.printReturnReceipt(returnTransaction);

    // Clear return items
    this.clearReturn();

    this.emit('return_completed', returnTransaction);

    return returnTransaction;
  }

  /**
   * Process return to store credit
   */
  async processReturnToStoreCredit(customerId: number): Promise<ReturnTransaction> {
    logger.info('Processing return to store credit', { customer_id: customerId });

    const totals = this.calculateTotals();

    // Create store credit
    const storeCredit = await prisma.storeCredit.create({
      data: {
        user_id: customerId,
        amount: Math.round(totals.total_refund * 100),
        reason: 'Product return',
        reference_type: 'RETURN',
        reference_id: this.originalTransaction.id,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        created_at: new Date(),
      },
    });

    const returnTransaction = await this.saveReturn({
      refund_method: 'store_credit',
      refund_details: {
        store_credit_id: storeCredit.id,
        amount: totals.total_refund,
      },
      status: 'completed',
    });

    // Update inventory
    await this.restoreInventory();

    // Print receipt
    await this.printReturnReceipt(returnTransaction);

    // Clear return items
    this.clearReturn();

    this.emit('return_completed', returnTransaction);

    return returnTransaction;
  }

  /**
   * Process cash refund
   */
  async processReturnToCash(): Promise<ReturnTransaction> {
    logger.info('Processing return to cash');

    const totals = this.calculateTotals();

    const returnTransaction = await this.saveReturn({
      refund_method: 'cash',
      refund_details: {
        amount: totals.total_refund,
      },
      status: 'completed',
    });

    // Update inventory
    await this.restoreInventory();

    // Print receipt
    await this.printReturnReceipt(returnTransaction);

    // Clear return items
    this.clearReturn();

    this.emit('return_completed', returnTransaction);

    return returnTransaction;
  }

  /**
   * Save return transaction
   */
  private async saveReturn(data: {
    refund_method: string;
    refund_details: any;
    status: string;
  }): Promise<ReturnTransaction> {
    const totals = this.calculateTotals();

    const transaction = await prisma.transaction.create({
      data: {
        register_id: this.registerId,
        shift_id: this.shiftId,
        cashier_id: this.cashierId,
        customer_id: this.originalTransaction.customer_id,
        original_transaction_id: this.originalTransaction.id,
        type: 'RETURN',
        subtotal: Math.round(totals.subtotal * 100),
        tax: Math.round(totals.tax_refund * 100),
        discount: 0,
        total: Math.round(totals.total_refund * 100),
        payment_method: data.refund_method.toUpperCase(),
        payment_details: JSON.stringify(data.refund_details),
        status: data.status.toUpperCase(),
        created_at: new Date(),
        items: {
          create: this.returnItems.map(item => ({
            product_id: item.product_id,
            variant_id: item.variant_id,
            name: item.name,
            sku: item.sku,
            quantity: item.quantity,
            price: Math.round(item.original_price * 100),
            discount: 0,
            tax_rate: 0,
            total: Math.round(item.refund_amount * 100),
            return_reason: item.return_reason,
            return_condition: item.condition,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    return {
      id: transaction.id,
      register_id: transaction.register_id,
      shift_id: transaction.shift_id,
      cashier_id: transaction.cashier_id,
      original_transaction_id: this.originalTransaction.id,
      customer_id: transaction.customer_id || undefined,
      items: this.returnItems,
      subtotal: totals.subtotal,
      tax_refund: totals.tax_refund,
      total_refund: totals.total_refund,
      refund_method: data.refund_method as any,
      status: data.status as any,
      created_at: transaction.created_at,
    };
  }

  /**
   * Restore inventory
   */
  private async restoreInventory(): Promise<void> {
    for (const item of this.returnItems) {
      // Only restore if condition is new or opened
      if (item.condition === 'new' || item.condition === 'opened') {
        await prisma.inventory.update({
          where: { product_id: item.product_id },
          data: {
            quantity: {
              increment: item.quantity,
            },
            updated_at: new Date(),
          },
        });
      } else {
        // Log damaged/defective items separately
        await prisma.damagedInventory.create({
          data: {
            product_id: item.product_id,
            variant_id: item.variant_id,
            quantity: item.quantity,
            condition: item.condition,
            reason: item.return_reason,
            created_at: new Date(),
          },
        });
      }
    }
  }

  /**
   * Print return receipt
   */
  private async printReturnReceipt(returnTx: ReturnTransaction): Promise<void> {
    const register = await prisma.register.findUnique({
      where: { id: this.registerId },
      include: { store: true },
    });

    if (!register) return;

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
        id: `RETURN-${returnTx.id}`,
        date: returnTx.created_at,
        cashier: returnTx.cashier_id.toString(),
        register: register.name,
      },
      items: returnTx.items.map(item => ({
        name: `[RETURN] ${item.name}`,
        quantity: item.quantity,
        price: -item.original_price,
        total: -item.refund_amount,
      })),
      totals: {
        subtotal: -returnTx.subtotal,
        tax: -returnTx.tax_refund,
        discount: 0,
        total: -returnTx.total_refund,
        payment_method: returnTx.refund_method,
        amount_paid: -returnTx.total_refund,
      },
      footer: {
        thank_you: 'Thank you for your business!',
        return_policy: `Original Transaction: ${this.originalTransaction.id}`,
      },
    });
  }

  /**
   * Clear return items
   */
  clearReturn(): void {
    this.returnItems = [];
    this.originalTransaction = undefined;
    this.emit('return_cleared');
  }

  /**
   * Get return items
   */
  getReturnItems(): ReturnItem[] {
    return [...this.returnItems];
  }

  /**
   * Reject return
   */
  async rejectReturn(reason: string): Promise<void> {
    logger.info('Rejecting return', { reason });

    if (this.originalTransaction) {
      await prisma.returnRejection.create({
        data: {
          transaction_id: this.originalTransaction.id,
          register_id: this.registerId,
          cashier_id: this.cashierId,
          reason,
          created_at: new Date(),
        },
      });
    }

    this.clearReturn();
    this.emit('return_rejected', { reason });
  }
}

export default ReturnTransactionProcessor;
