/**
 * USDC (Stablecoin) Payment Processor
 * Purpose: Accept USDC payments on Ethereum
 */

import { ethers } from 'ethers';
import { logger } from '@/lib/logger';

const USDC_CONTRACT_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDC_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint amount) returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint amount)',
];

export class USDCPayment {
  private provider: ethers.providers.Provider;
  private contract: ethers.Contract;
  private wallet: ethers.Wallet;

  constructor() {
    this.provider = new ethers.providers.JsonRpcProvider(
      process.env.ETHEREUM_RPC_URL || ''
    );

    const privateKey = process.env.ETHEREUM_PRIVATE_KEY || '';
    this.wallet = new ethers.Wallet(privateKey, this.provider);

    this.contract = new ethers.Contract(
      USDC_CONTRACT_ADDRESS,
      USDC_ABI,
      this.provider
    );
  }

  async getBalance(address: string): Promise<string> {
    const balance = await this.contract.balanceOf(address);
    return ethers.utils.formatUnits(balance, 6); // USDC has 6 decimals
  }

  async checkPayment(address: string, expectedAmount: number): Promise<boolean> {
    const balance = await this.getBalance(address);
    return parseFloat(balance) >= expectedAmount;
  }

  async transfer(toAddress: string, amount: number): Promise<string> {
    logger.info('Transferring USDC', { toAddress, amount });

    const contractWithSigner = this.contract.connect(this.wallet);
    const amountInUnits = ethers.utils.parseUnits(amount.toFixed(6), 6);

    const tx = await contractWithSigner.transfer(toAddress, amountInUnits);
    await tx.wait();

    return tx.hash;
  }

  async monitorTransfers(address: string, callback: (from: string, amount: string) => void): Promise<void> {
    const filter = this.contract.filters.Transfer(null, address);

    this.contract.on(filter, (from, to, amount) => {
      const formattedAmount = ethers.utils.formatUnits(amount, 6);
      callback(from, formattedAmount);
    });
  }
}

export default USDCPayment;
