/**
 * Multi-Armed Bandit
 * Purpose: A/B testing and optimization using bandit algorithms
 * Algorithms: Epsilon-Greedy, UCB, Thompson Sampling
 * Use Cases:
 * - Dynamic content selection
 * - Price optimization
 * - Product recommendations
 * - Marketing message testing
 */

import { logger } from '@/lib/logger';
import { redis } from '@/lib/redis';

export interface Arm {
  id: string;
  name: string;
  data: any;
}

export interface ArmStats {
  pulls: number;
  rewards: number;
  avgReward: number;
  confidence: number;
}

export class MultiArmedBandit {
  private arms: Arm[] = [];
  private stats: Map<string, ArmStats> = new Map();
  private epsilon = 0.1; // Exploration rate

  constructor(arms: Arm[]) {
    this.arms = arms;
    this.initializeStats();
  }

  /**
   * Initialize statistics for all arms
   */
  private initializeStats(): void {
    this.arms.forEach((arm) => {
      this.stats.set(arm.id, {
        pulls: 0,
        rewards: 0,
        avgReward: 0,
        confidence: 0,
      });
    });
  }

  /**
   * Select arm using Epsilon-Greedy strategy
   */
  selectArmEpsilonGreedy(): Arm {
    // Exploration: random arm
    if (Math.random() < this.epsilon) {
      return this.arms[Math.floor(Math.random() * this.arms.length)];
    }

    // Exploitation: best performing arm
    let bestArm = this.arms[0];
    let bestReward = this.stats.get(bestArm.id)!.avgReward;

    this.arms.forEach((arm) => {
      const stats = this.stats.get(arm.id)!;
      if (stats.avgReward > bestReward) {
        bestReward = stats.avgReward;
        bestArm = arm;
      }
    });

    return bestArm;
  }

  /**
   * Select arm using Upper Confidence Bound (UCB)
   */
  selectArmUCB(): Arm {
    const totalPulls = Array.from(this.stats.values()).reduce(
      (sum, stats) => sum + stats.pulls,
      0
    );

    if (totalPulls === 0) {
      return this.arms[0];
    }

    let bestArm = this.arms[0];
    let bestUCB = -Infinity;

    this.arms.forEach((arm) => {
      const stats = this.stats.get(arm.id)!;

      if (stats.pulls === 0) {
        bestArm = arm;
        bestUCB = Infinity;
        return;
      }

      // UCB1 formula
      const ucb =
        stats.avgReward + Math.sqrt((2 * Math.log(totalPulls)) / stats.pulls);

      if (ucb > bestUCB) {
        bestUCB = ucb;
        bestArm = arm;
      }
    });

    return bestArm;
  }

  /**
   * Select arm using Thompson Sampling (Beta distribution)
   */
  selectArmThompsonSampling(): Arm {
    let bestArm = this.arms[0];
    let bestSample = -Infinity;

    this.arms.forEach((arm) => {
      const stats = this.stats.get(arm.id)!;

      // Beta distribution parameters
      const alpha = stats.rewards + 1;
      const beta = stats.pulls - stats.rewards + 1;

      // Sample from Beta(alpha, beta)
      const sample = this.betaSample(alpha, beta);

      if (sample > bestSample) {
        bestSample = sample;
        bestArm = arm;
      }
    });

    return bestArm;
  }

  /**
   * Sample from Beta distribution
   */
  private betaSample(alpha: number, beta: number): number {
    // Simplified beta sampling using gamma distributions
    const gamma1 = this.gammaSample(alpha);
    const gamma2 = this.gammaSample(beta);
    return gamma1 / (gamma1 + gamma2);
  }

  /**
   * Sample from Gamma distribution
   */
  private gammaSample(shape: number): number {
    // Simplified gamma sampling
    // In production, use a proper statistical library
    let sum = 0;
    for (let i = 0; i < shape; i++) {
      sum += -Math.log(Math.random());
    }
    return sum;
  }

  /**
   * Update arm statistics after observing reward
   */
  update(armId: string, reward: number): void {
    const stats = this.stats.get(armId);

    if (!stats) {
      throw new Error(`Arm ${armId} not found`);
    }

    stats.pulls += 1;
    stats.rewards += reward;
    stats.avgReward = stats.rewards / stats.pulls;
    stats.confidence = this.calculateConfidence(stats);

    logger.info('Updated arm statistics', { armId, stats });

    this.saveStats();
  }

  /**
   * Calculate confidence interval
   */
  private calculateConfidence(stats: ArmStats): number {
    if (stats.pulls === 0) return 0;

    // Wilson score confidence interval
    const z = 1.96; // 95% confidence
    const phat = stats.avgReward;
    const n = stats.pulls;

    const denominator = 1 + (z * z) / n;
    const centre = phat + (z * z) / (2 * n);
    const margin = z * Math.sqrt((phat * (1 - phat) + (z * z) / (4 * n)) / n);

    return (centre - margin) / denominator;
  }

  /**
   * Get statistics for all arms
   */
  getStatistics(): Map<string, ArmStats> {
    return this.stats;
  }

  /**
   * Get best performing arm
   */
  getBestArm(): { arm: Arm; stats: ArmStats } {
    let bestArm = this.arms[0];
    let bestStats = this.stats.get(bestArm.id)!;

    this.arms.forEach((arm) => {
      const stats = this.stats.get(arm.id)!;
      if (stats.avgReward > bestStats.avgReward) {
        bestArm = arm;
        bestStats = stats;
      }
    });

    return { arm: bestArm, stats: bestStats };
  }

  /**
   * Save statistics to Redis
   */
  private async saveStats(): Promise<void> {
    const data = Array.from(this.stats.entries());
    await redis.set('bandit:stats', JSON.stringify(data));
  }

  /**
   * Load statistics from Redis
   */
  async loadStats(): Promise<void> {
    const data = await redis.get('bandit:stats');

    if (data) {
      this.stats = new Map(JSON.parse(data));
      logger.info('Loaded bandit statistics');
    }
  }
}

export default MultiArmedBandit;
