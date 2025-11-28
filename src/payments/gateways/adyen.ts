/**
 * Adyen Payment Gateway
 * Purpose: Process payments via Adyen
 * Description: Global payment platform supporting 250+ payment methods
 * 
 * Features:
 * - Credit/debit cards
 * - Digital wallets
 * - Local payment methods
 * - 3D Secure authentication
 * - Tokenization for recurring payments
 * - Multi-currency support
 * - Real-time risk management
 * 
 * Supported Methods:
 * - Cards: Visa, Mastercard, Amex, Discover
 * - Wallets: Apple Pay, Google Pay, PayPal
 * - Local: iDEAL, Bancontact, Sofort, Giropay
 * - BNPL: Klarna, Afterpay
 * 
 * @example
 * ```typescript
 * const adyen = new AdyenGateway();
 * const payment = await adyen.createPayment({
 *   amount: 5000, // $50.00
 *   currency: 'USD',
 *   paymentMethod: 'scheme',
 *   returnUrl: 'https://example.com/checkout/return'
 * });
 * ```
 */

import { Client, CheckoutAPI } from '@adyen/api-library';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

export interface AdyenPaymentRequest {
  amount: number;
  currency: string;
  reference: string;
  paymentMethod: any;
  returnUrl: string;
  shopperEmail?: string;
  shopperReference?: string;
  countryCode?: string;
  shopperLocale?: string;
  metadata?: Record<string, string>;
}

export interface AdyenPaymentResponse {
  resultCode: string;
  pspReference?: string;
  action?: any;
  refusalReason?: string;
  merchantReference?: string;
}

export class AdyenGateway {
  private client: Client;
  private checkout: CheckoutAPI;
  private merchantAccount: string;

  constructor() {
    this.client = new Client({
      apiKey: process.env.ADYEN_API_KEY || '',
      environment: process.env.ADYEN_ENVIRONMENT || 'TEST',
    });
    this.checkout = new CheckoutAPI(this.client);
    this.merchantAccount = process.env.ADYEN_MERCHANT_ACCOUNT || '';
  }

  /**
   * Create payment
   */
  async createPayment(request: AdyenPaymentRequest): Promise<AdyenPaymentResponse> {
    logger.info('Creating Adyen payment', {
      amount: request.amount,
      currency: request.currency,
      reference: request.reference,
    });

    try {
      const paymentRequest = {
        amount: {
          currency: request.currency,
          value: request.amount, // In minor units (cents)
        },
        reference: request.reference,
        paymentMethod: request.paymentMethod,
        returnUrl: request.returnUrl,
        merchantAccount: this.merchantAccount,
        shopperEmail: request.shopperEmail,
        shopperReference: request.shopperReference,
        countryCode: request.countryCode,
        shopperLocale: request.shopperLocale,
        metadata: request.metadata,
        channel: 'Web',
      };

      const response = await this.checkout.payments(paymentRequest);

      // Save transaction
      await this.saveTransaction(request, response);

      logger.info('Adyen payment created', {
        resultCode: response.resultCode,
        pspReference: response.pspReference,
      });

      return {
        resultCode: response.resultCode,
        pspReference: response.pspReference,
        action: response.action,
        refusalReason: response.refusalReason,
        merchantReference: response.merchantReference,
      };
    } catch (error) {
      logger.error('Adyen payment failed', { error, request });
      throw new Error('Payment processing failed');
    }
  }

  /**
   * Handle payment details (for 3DS, redirect flows)
   */
  async submitPaymentDetails(data: any): Promise<AdyenPaymentResponse> {
    logger.info('Submitting payment details to Adyen');

    try {
      const response = await this.checkout.paymentsDetails({
        details: data,
      });

      return {
        resultCode: response.resultCode,
        pspReference: response.pspReference,
        action: response.action,
        refusalReason: response.refusalReason,
      };
    } catch (error) {
      logger.error('Adyen payment details submission failed', { error });
      throw error;
    }
  }

  /**
   * Capture payment
   */
  async capturePayment(
    pspReference: string,
    amount: number,
    currency: string
  ): Promise<any> {
    logger.info('Capturing Adyen payment', { pspReference, amount });

    try {
      const response = await this.checkout.paymentsCapture({
        merchantAccount: this.merchantAccount,
        amount: {
          currency,
          value: amount,
        },
      }, pspReference);

      logger.info('Payment captured', { pspReference, status: response.status });
      return response;
    } catch (error) {
      logger.error('Capture failed', { error, pspReference });
      throw error;
    }
  }

  /**
   * Refund payment
   */
  async refundPayment(
    pspReference: string,
    amount: number,
    currency: string,
    reference: string
  ): Promise<any> {
    logger.info('Refunding Adyen payment', { pspReference, amount });

    try {
      const response = await this.checkout.paymentsRefund({
        merchantAccount: this.merchantAccount,
        amount: {
          currency,
          value: amount,
        },
        reference,
      }, pspReference);

      logger.info('Refund processed', { pspReference });
      return response;
    } catch (error) {
      logger.error('Refund failed', { error, pspReference });
      throw error;
    }
  }

  /**
   * Cancel or reverse payment
   */
  async cancelPayment(pspReference: string, reference: string): Promise<any> {
    logger.info('Cancelling Adyen payment', { pspReference });

    try {
      const response = await this.checkout.paymentsCancel({
        merchantAccount: this.merchantAccount,
        reference,
      }, pspReference);

      logger.info('Payment cancelled', { pspReference });
      return response;
    } catch (error) {
      logger.error('Cancellation failed', { error, pspReference });
      throw error;
    }
  }

  /**
   * Get payment methods
   */
  async getPaymentMethods(
    amount: number,
    currency: string,
    countryCode: string,
    shopperLocale?: string
  ): Promise<any> {
    logger.info('Getting Adyen payment methods', { currency, countryCode });

    try {
      const response = await this.checkout.paymentMethods({
        merchantAccount: this.merchantAccount,
        amount: {
          currency,
          value: amount,
        },
        countryCode,
        shopperLocale,
        channel: 'Web',
      });

      return response.paymentMethods;
    } catch (error) {
      logger.error('Failed to get payment methods', { error });
      throw error;
    }
  }

  /**
   * Store payment method for recurring payments
   */
  async storePaymentMethod(
    shopperReference: string,
    paymentMethod: any
  ): Promise<string> {
    logger.info('Storing payment method', { shopperReference });

    const response = await this.createPayment({
      amount: 0,
      currency: 'USD',
      reference: `STORE-${Date.now()}`,
      paymentMethod: {
        ...paymentMethod,
        storeDetails: true,
      },
      returnUrl: 'https://example.com/return',
      shopperReference,
    });

    return response.pspReference || '';
  }

  /**
   * Process recurring payment
   */
  async processRecurringPayment(
    shopperReference: string,
    recurringDetailReference: string,
    amount: number,
    currency: string,
    reference: string
  ): Promise<AdyenPaymentResponse> {
    logger.info('Processing recurring payment', { shopperReference, amount });

    return this.createPayment({
      amount,
      currency,
      reference,
      paymentMethod: {
        type: 'scheme',
        storedPaymentMethodId: recurringDetailReference,
      },
      returnUrl: 'https://example.com/return',
      shopperReference,
      shopperInteraction: 'ContAuth',
      recurringProcessingModel: 'Subscription',
    } as any);
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(
    payload: string,
    signature: string,
    hmacKey: string
  ): boolean {
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', hmacKey)
      .update(payload)
      .digest('base64');

    return signature === expectedSignature;
  }

  /**
   * Handle webhook notification
   */
  async handleWebhook(notification: any): Promise<void> {
    logger.info('Processing Adyen webhook', {
      eventCode: notification.eventCode,
      pspReference: notification.pspReference,
    });

    const { eventCode, success, pspReference, merchantReference } = notification;

    switch (eventCode) {
      case 'AUTHORISATION':
        await this.handleAuthorisation(pspReference, merchantReference, success);
        break;
      case 'CAPTURE':
        await this.handleCapture(pspReference, success);
        break;
      case 'REFUND':
        await this.handleRefund(pspReference, success);
        break;
      case 'CANCELLATION':
        await this.handleCancellation(pspReference, success);
        break;
      default:
        logger.warn('Unknown webhook event', { eventCode });
    }
  }

  /**
   * Save transaction to database
   */
  private async saveTransaction(
    request: AdyenPaymentRequest,
    response: any
  ): Promise<void> {
    await prisma.paymentTransaction.create({
      data: {
        gateway: 'adyen',
        transaction_id: response.pspReference || '',
        order_reference: request.reference,
        amount: request.amount,
        currency: request.currency,
        status: response.resultCode,
        raw_request: JSON.stringify(request),
        raw_response: JSON.stringify(response),
        created_at: new Date(),
      },
    });
  }

  private async handleAuthorisation(
    pspReference: string,
    merchantReference: string,
    success: boolean
  ): Promise<void> {
    const status = success ? 'authorized' : 'failed';
    
    await prisma.paymentTransaction.updateMany({
      where: { transaction_id: pspReference },
      data: { status, updated_at: new Date() },
    });
  }

  private async handleCapture(pspReference: string, success: boolean): Promise<void> {
    if (success) {
      await prisma.paymentTransaction.updateMany({
        where: { transaction_id: pspReference },
        data: { status: 'captured', updated_at: new Date() },
      });
    }
  }

  private async handleRefund(pspReference: string, success: boolean): Promise<void> {
    if (success) {
      await prisma.paymentTransaction.updateMany({
        where: { transaction_id: pspReference },
        data: { status: 'refunded', updated_at: new Date() },
      });
    }
  }

  private async handleCancellation(pspReference: string, success: boolean): Promise<void> {
    if (success) {
      await prisma.paymentTransaction.updateMany({
        where: { transaction_id: pspReference },
        data: { status: 'cancelled', updated_at: new Date() },
      });
    }
  }

  /**
   * Get supported payment methods list
   */
  getSupportedMethods(): string[] {
    return [
      'scheme', // Cards
      'ideal', // iDEAL (Netherlands)
      'klarna', // Klarna
      'paypal',
      'applepay',
      'googlepay',
      'bancontact_mobile', // Belgium
      'giropay', // Germany
      'sofort', // Europe
      'sepadirectdebit',
      'afterpaytouch', // Afterpay
      'paywithgoogle',
      'alipay',
      'wechatpayWeb',
    ];
  }
}

export default AdyenGateway;
