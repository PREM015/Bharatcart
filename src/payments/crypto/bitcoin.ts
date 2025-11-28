/**
 * Bitcoin Payment Processor
 * Purpose: Accept Bitcoin payments
 */

import axios from 'axios';
import { logger } from '@/lib/logger';

export class BitcoinPayment {
  private apiKey: string;
  private baseUrl = 'https://api.blockchain.com/v3/receive';

  constructor() {
    this.apiKey = process.env.BLOCKCHAIN_API_KEY || '';
  }

  async generateAddress(orderId: string): Promise<{
    address: string;
    index: number;
  }> {
    logger.info('Generating Bitcoin address', { orderId });

    const response = await axios.get(`${this.baseUrl}/checkgap`, {
      params: {
        xpub: process.env.BITCOIN_XPUB,
        key: this.apiKey,
      },
    });

    return {
      address: response.data.address,
      index: response.data.index,
    };
  }

  async getBalance(address: string): Promise<number> {
    const response = await axios.get(
      `https://blockchain.info/q/addressbalance/${address}`
    );

    return parseInt(response.data);
  }

  async checkPayment(address: string, expectedAmount: number): Promise<boolean> {
    const balance = await this.getBalance(address);
    return balance >= expectedAmount;
  }

  convertToBTC(usdAmount: number, btcPrice: number): number {
    return usdAmount / btcPrice;
  }

  async getCurrentPrice(): Promise<number> {
    const response = await axios.get('https://blockchain.info/ticker');
    return response.data.USD.last;
  }
}

export default BitcoinPayment;
