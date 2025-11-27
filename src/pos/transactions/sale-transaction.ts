/**
 * Sale Transaction Processing
 * Purpose: Process sales at POS
 * Description: Cart management, payment processing, receipt generation
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { EventEmitter } from 'events';
import { ReceiptPrinter } from '../hardware/receipt-printer';
import { CardReader } from '../hardware/card-reader';

export interface CartItem {
  product_id: number;
  variant_id?: number;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  discount?: number;
  tax_rate: number;
  total: number;
}

export interface SaleTransaction {
  id?: number;
  register_id: number;
  shift_id: number;
  cashier_id: number;
  customer_id?: number;
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  payment_method: 'cash' | 'card' | 'split';
  payment_details?: any;
  status: 'pending' | 'completed' | 'cancelled';
  created_at: Date;
}

export class SaleTransactionProcessor extends EventEmitter {
  private registerId: number;
  private shiftId: number;
  private cashierId: number;
  private cart: CartItem[] = [];
  private customerId?: number;
  private printer: ReceiptPrinter;
  private cardReader?: CardReader;

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
   * Add item to cart
   */
  async addItem(item: Omit<CartItem, 'total'>): Promise<void> {
    logger.info('Adding item to cart', {
      product_id: item.product_id,
      quantity: item.quantity,
    });

    // Verify product exists and is in stock
    const product = await prisma.product.findUnique({
      where: { id: item.product_id },
      include: { inventory: true },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    if (product.inventory && product.inventory.quantity < item.quantity) {
      throw new Error('Insufficient inventory');
    }

    // Calculate item total
    const subtotal = item.price * item.quantity;
    const discount = item.discount || 0;
    const taxAmount = (subtotal - discount) * item.tax_rate;
    const total = subtotal - discount + taxAmount;

    const cartItem: CartItem = {
      ...item,
      total,
    };

    // Check if item already in cart
    const existingIndex = this.cart.findIndex(
      i => i.product_id === item.product_id && i.variant_id === item.variant_id
    );

    if (existingIndex >= 0) {
      // Update quantity
      this.cart[existingIndex].quantity += item.quantity;
      this.cart[existingIndex].total = this.calculateItemTotal(
        this.cart[existingIndex]
      );
    } else {
      // Add new item
      this.cart.push(cartItem);
    }

    this.emit('item_added', cartItem);
    this.emit('cart_updated', this.cart);
  }

  /**
   * Remove item from cart
   */
  removeItem(productId: number, variantId?: number): void {
    logger.info('Removing item from cart', { product_id: productId });

    const index = this.cart.findIndex(
      i => i.product_id === productId && i.variant_id === variantId
    );

    if (index >= 0) {
      const item = this.cart.splice(index, 1)[0];
      this.emit('item_removed', item);
      this.emit('cart_updated', this.cart);
    }
  }

  /**
   * Update item quantity
   */
  updateQuantity(
    productId: number,
    quantity: number,
    variantId?: number
  ): void {
    logger.info('Updating item quantity', {
      product_id: productId,
      quantity,
    });

    const item = this.cart.find(
      i => i.product_id === productId && i.variant_id === variantId
    );

    if (item) {
      item.quantity = quantity;
      item.total = this.calculateItemTotal(item);

      this.emit('quantity_updated', item);
      this.emit('cart_updated', this.cart);
    }
  }

  /**
   * Apply discount to item
   */
  applyItemDiscount(
    productId: number,
    discount: number,
    variantId?: number
  ): void {
    logger.info('Applying item discount', {
      product_id: productId,
      discount,
    });

    const item = this.cart.find(
      i => i.product_id === productId && i.variant_id === variantId
    );

    if (item) {
      item.discount = discount;
      item.total = this.calculateItemTotal(item);

      this.emit('discount_applied', item);
      this.emit('cart_updated', this.cart);
    }
  }

  /**
   * Set customer
   */
  setCustomer(customerId: number): void {
    logger.info('Setting customer', { customer_id: customerId });

    this.customerId = customerId;
    this.emit('customer_set', customerId);
  }

  /**
   * Calculate cart totals
   */
  calculateTotals(): {
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
  } {
    const subtotal = this.cart.reduce((sum, item) => {
      return sum + item.price * item.quantity;
    }, 0);

    const discount = this.cart.reduce((sum, item) => {
      return sum + (item.discount || 0);
    }, 0);

    const tax = this.cart.reduce((sum, item) => {
      const itemSubtotal = item.price * item.quantity;
      const itemDiscount = item.discount || 0;
      return sum + (itemSubtotal - itemDiscount) * item.tax_rate;
    }, 0);

    const total = subtotal - discount + tax;

    return {
      subtotal,
      tax,
      discount,
      total,
    };
  }

  /**
   * Process cash payment
   */
  async processCashPayment(amountTendered: number): Promise<SaleTransaction> {
    logger.info('Processing cash payment', { amount: amountTendered });

    const totals = this.calculateTotals();

    if (amountTendered < totals.total) {
      throw new Error('Insufficient payment amount');
    }

    const change = amountTendered - totals.total;

    const transaction = await this.saveTransaction({
      payment_method: 'cash',
      payment_details: {
        amount_tendered: amountTendered,
        change,
      },
      status: 'completed',
    });

    // Print receipt
    await this.printReceipt(transaction, { change });

    // Update inventory
    await this.updateInventory();

    // Clear cart
    this.clearCart();

    this.emit('transaction_completed', transaction);

    return transaction;
  }

  /**
   * Process card payment
   */
  async processCardPayment(cardReaderId?: string): Promise<SaleTransaction> {
    logger.info('Processing card payment');

    const totals = this.calculateTotals();

    // Initialize card reader if needed
    if (!this.cardReader && cardReaderId) {
      this.cardReader = new CardReader(cardReaderId);
      await this.cardReader.connect();
    }

    if (!this.cardReader) {
      throw new Error('Card reader not initialized');
    }

    // Process payment
    const paymentResult = await this.cardReader.processPayment(
      totals.total,
      'USD',
      {
        register_id: this.registerId,
        shift_id: this.shiftId,
      }
    );

    if (!paymentResult.success) {
      throw new Error(paymentResult.error || 'Card payment failed');
    }

    const transaction = await this.saveTransaction({
      payment_method: 'card',
      payment_details: {
        approval_code: paymentResult.approval_code,
        transaction_id: paymentResult.transaction_id,
      },
      status: 'completed',
    });

    // Print receipt
    await this.printReceipt(transaction);

    // Update inventory
    await this.updateInventory();

    // Clear cart
    this.clearCart();

    this.emit('transaction_completed', transaction);

    return transaction;
  }

  /**
   * Process split payment
   */
  async processSplitPayment(
    cashAmount: number,
    cardAmount: number
  ): Promise<SaleTransaction> {
    logger.info('Processing split payment', { cashAmount, cardAmount });

    const totals = this.calculateTotals();

    if (cashAmount + cardAmount < totals.total) {
      throw new Error('Split payment does not cover total');
    }

    // Process card portion
    let cardApproval;
    if (cardAmount > 0 && this.cardReader) {
      const cardResult = await this.cardReader.processPayment(cardAmount, 'USD');
      if (!cardResult.success) {
        throw new Error('Card payment failed');
      }
      cardApproval = cardResult.approval_code;
    }

    const change = cashAmount + cardAmount - totals.total;

    const transaction = await this.saveTransaction({
      payment_method: 'split',
      payment_details: {
        cash_amount: cashAmount,
        card_amount: cardAmount,
        card_approval: cardApproval,
        change,
      },
      status: 'completed',
    });

    // Print receipt
    await this.printReceipt(transaction, { change });

    // Update inventory
    await this.updateInventory();

    // Clear cart
    this.clearCart();

    this.emit('transaction_completed', transaction);

    return transaction;
  }

  /**
   * Save transaction to database
   */
  private async saveTransaction(data: {
    payment_method: string;
    payment_details: any;
    status: string;
  }): Promise<SaleTransaction> {
    const totals = this.calculateTotals();

    const transaction = await prisma.transaction.create({
      data: {
        register_id: this.registerId,
        shift_id: this.shiftId,
        cashier_id: this.cashierId,
        customer_id: this.customerId,
        type: 'SALE',
        subtotal: Math.round(totals.subtotal * 100),
        tax: Math.round(totals.tax * 100),
        discount: Math.round(totals.discount * 100),
        total: Math.round(totals.total * 100),
        payment_method: data.payment_method.toUpperCase(),
        payment_details: JSON.stringify(data.payment_details),
        status: data.status.toUpperCase(),
        created_at: new Date(),
        items: {
          create: this.cart.map(item => ({
            product_id: item.product_id,
            variant_id: item.variant_id,
            name: item.name,
            sku: item.sku,
            quantity: item.quantity,
            price: Math.round(item.price * 100),
            discount: Math.round((item.discount || 0) * 100),
            tax_rate: item.tax_rate,
            total: Math.round(item.total * 100),
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
      customer_id: transaction.customer_id || undefined,
      items: this.cart,
      subtotal: totals.subtotal,
      tax: totals.tax,
      discount: totals.discount,
      total: totals.total,
      payment_method: data.payment_method as any,
      payment_details: data.payment_details,
      status: data.status as any,
      created_at: transaction.created_at,
    };
  }

  /**
   * Print receipt
   */
  private async printReceipt(
    transaction: SaleTransaction,
    extras?: { change?: number }
  ): Promise<void> {
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
        id: transaction.id?.toString() || '',
        date: transaction.created_at,
        cashier: transaction.cashier_id.toString(),
        register: register.name,
      },
      items: transaction.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
      })),
      totals: {
        subtotal: transaction.subtotal,
        tax: transaction.tax,
        discount: transaction.discount,
        total: transaction.total,
        payment_method: transaction.payment_method,
        amount_paid: transaction.total + (extras?.change || 0),
        change: extras?.change,
      },
      footer: {
        thank_you: 'Thank you for your purchase!',
        return_policy: 'Returns within 30 days with receipt',
      },
    });
  }

  /**
   * Update inventory
   */
  private async updateInventory(): Promise<void> {
    for (const item of this.cart) {
      await prisma.inventory.update({
        where: { product_id: item.product_id },
        data: {
          quantity: {
            decrement: item.quantity,
          },
          updated_at: new Date(),
        },
      });
    }
  }

  /**
   * Calculate item total
   */
  private calculateItemTotal(item: CartItem): number {
    const subtotal = item.price * item.quantity;
    const discount = item.discount || 0;
    const tax = (subtotal - discount) * item.tax_rate;
    return subtotal - discount + tax;
  }

  /**
   * Clear cart
   */
  clearCart(): void {
    this.cart = [];
    this.customerId = undefined;
    this.emit('cart_cleared');
  }

  /**
   * Get current cart
   */
  getCart(): CartItem[] {
    return [...this.cart];
  }

  /**
   * Cancel transaction
   */
  async cancelTransaction(): Promise<void> {
    logger.info('Cancelling transaction');

    this.clearCart();
    this.emit('transaction_cancelled');
  }
}

export default SaleTransactionProcessor;
