/**
 * Ethereum Payment Processor
 * Purpose: Accept ETH and ERC-20 token payments
 */

import { ethers } from 'ethers';
import { logger } from '@/lib/logger';

export class EthereumPayment {
  private provider: ethers.providers.Provider;
  private wallet: ethers.Wallet;

  constructor() {
    this.provider = new ethers.providers.JsonRpcProvider(
      process.env.ETHEREUM_RPC_URL || 'https://mainnet.infura.io/v3/YOUR-PROJECT-ID'
    );

    const privateKey = process.env.ETHEREUM_PRIVATE_KEY || '';
    this.wallet = new ethers.Wallet(privateKey, this.provider);
  }

  async generatePaymentAddress(): Promise<string> {
    const newWallet = ethers.Wallet.createRandom();
    return newWallet.address;
  }

  async getBalance(address: string): Promise<string> {
    const balance = await this.provider.getBalance(address);
    return ethers.utils.formatEther(balance);
  }

  async checkPayment(
    address: string,
    expectedAmount: string
  ): Promise<boolean> {
    const balance = await this.getBalance(address);
    return parseFloat(balance) >= parseFloat(expectedAmount);
  }

  async transferTo(toAddress: string, amount: string): Promise<string> {
    logger.info('Transferring ETH', { toAddress, amount });

    const tx = await this.wallet.sendTransaction({
      to: toAddress,
      value: ethers.utils.parseEther(amount),
    });

    await tx.wait();
    return tx.hash;
  }

  convertToETH(usdAmount: number, ethPrice: number): string {
    return (usdAmount / ethPrice).toFixed(8);
  }

  async getTransaction(txHash: string): Promise<any> {
    return await this.provider.getTransaction(txHash);
  }

  async waitForConfirmations(txHash: string, confirmations: number = 6): Promise<void> {
    const tx = await this.provider.getTransaction(txHash);
    await tx.wait(confirmations);
  }
}

export default EthereumPayment;
