/**
 * Risk Scoring System
 * Purpose: Calculate fraud risk scores
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

export class RiskScoring {
  async calculateRiskScore(transaction: any): Promise<number> {
    let score = 0;

    // Amount-based risk
    score += this.getAmountRisk(transaction.amount);

    // User history risk
    score += await this.getUserHistoryRisk(transaction.userId);

    // IP risk
    score += await this.getIPRisk(transaction.ipAddress);

    // Time-based risk
    score += this.getTimeBasedRisk(transaction.timestamp);

    // Card risk
    score += await this.getCardRisk(transaction.cardBin);

    return Math.min(100, score);
  }

  private getAmountRisk(amount: number): number {
    if (amount > 500000) return 30; // $5000+
    if (amount > 100000) return 20; // $1000+
    if (amount > 50000) return 10;  // $500+
    return 0;
  }

  private async getUserHistoryRisk(userId: number): Promise<number> {
    const userOrders = await prisma.order.count({
      where: { user_id: userId },
    });

    if (userOrders === 0) return 25; // New customer
    if (userOrders < 3) return 15;   // Few orders
    return 0; // Established customer
  }

  private async getIPRisk(ipAddress: string): Promise<number> {
    // Check if IP is on blocklist
    const blocked = await prisma.blockedIP.findUnique({
      where: { ip_address: ipAddress },
    });

    return blocked ? 50 : 0;
  }

  private getTimeBasedRisk(timestamp: Date): number {
    const hour = timestamp.getHours();
    
    // Late night transactions (2 AM - 5 AM) are riskier
    if (hour >= 2 && hour < 5) return 15;
    
    return 0;
  }

  private async getCardRisk(cardBin: string): Promise<number> {
    // Check card BIN against known fraud patterns
    return 0;
  }
}

export default RiskScoring;
