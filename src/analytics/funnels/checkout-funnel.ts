/**
 * Checkout Funnel
 * Purpose: Analyze checkout conversion funnel
 */

import { FunnelAnalyzer } from './funnel-analyzer';

export class CheckoutFunnel {
  private analyzer = new FunnelAnalyzer();

  async analyze(startDate: Date, endDate: Date) {
    const steps = [
      'view_cart',
      'begin_checkout',
      'add_shipping_info',
      'add_payment_info',
      'purchase',
    ];

    return this.analyzer.analyze(steps, startDate, endDate);
  }
}

export default CheckoutFunnel;
