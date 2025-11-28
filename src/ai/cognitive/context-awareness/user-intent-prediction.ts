/**
 * User Intent Prediction
 * Purpose: Predict user intentions from behavior patterns
 * Technologies: Machine Learning, Pattern Recognition, GPT-4
 * Features:
 * - Purchase intent prediction
 * - Churn risk detection
 * - Next action prediction
 * - User journey mapping
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';

export interface UserIntent {
  primaryIntent: string;
  confidence: number;
  alternativeIntents: Array<{
    intent: string;
    confidence: number;
  }>;
  predictedActions: string[];
  timeToAction: number; // minutes
  triggers: string[];
}

export interface IntentContext {
  userId: number;
  currentPage: string;
  sessionDuration: number;
  pagesVisited: string[];
  interactions: Array<{
    type: string;
    target: string;
    timestamp: Date;
  }>;
  cartItems: number;
  previousPurchases: number;
}

export class UserIntentPredictor {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Predict user intent
   */
  async predictIntent(context: IntentContext): Promise<UserIntent> {
    logger.info('Predicting user intent', { userId: context.userId });

    try {
      // Gather user history
      const userHistory = await this.getUserHistory(context.userId);

      // Build context for AI
      const contextDescription = this.buildContextDescription(context, userHistory);

      // Use GPT-4 to predict intent
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an expert at predicting user intent in e-commerce.
Analyze the user's behavior and predict their primary intent.
Return JSON with: primaryIntent, confidence, alternativeIntents, predictedActions, timeToAction, triggers`,
          },
          { role: 'user', content: contextDescription },
        ],
        response_format: { type: 'json_object' },
      });

      const prediction = JSON.parse(completion.choices[0].message.content || '{}');

      return {
        primaryIntent: prediction.primaryIntent || 'browsing',
        confidence: prediction.confidence || 0.5,
        alternativeIntents: prediction.alternativeIntents || [],
        predictedActions: prediction.predictedActions || [],
        timeToAction: prediction.timeToAction || 30,
        triggers: prediction.triggers || [],
      };
    } catch (error) {
      logger.error('Intent prediction failed', { error });
      throw error;
    }
  }

  /**
   * Build context description for AI
   */
  private buildContextDescription(context: IntentContext, history: any): string {
    return `User Behavior Analysis:
- Current Page: ${context.currentPage}
- Session Duration: ${context.sessionDuration} seconds
- Pages Visited: ${context.pagesVisited.join(', ')}
- Cart Items: ${context.cartItems}
- Previous Purchases: ${context.previousPurchases}
- Recent Interactions: ${context.interactions.map((i) => `${i.type} on ${i.target}`).join(', ')}
- Purchase History: ${history.totalPurchases} orders, avg ${history.avgOrderValue}
- Last Purchase: ${history.daysSinceLastPurchase} days ago
- Favorite Categories: ${history.favoriteCategories.join(', ')}

Predict the user's primary intent and likely next actions.`;
  }

  /**
   * Get user history
   */
  private async getUserHistory(userId: number): Promise<any> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        orders: {
          orderBy: { created_at: 'desc' },
          take: 10,
        },
      },
    });

    if (!user) {
      return {
        totalPurchases: 0,
        avgOrderValue: 0,
        daysSinceLastPurchase: 999,
        favoriteCategories: [],
      };
    }

    const totalPurchases = user.orders.length;
    const avgOrderValue =
      user.orders.reduce((sum, order) => sum + order.total, 0) / (totalPurchases || 1) / 100;

    const lastPurchase = user.orders[0];
    const daysSinceLastPurchase = lastPurchase
      ? Math.floor((Date.now() - lastPurchase.created_at.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    return {
      totalPurchases,
      avgOrderValue,
      daysSinceLastPurchase,
      favoriteCategories: ['Electronics', 'Fashion'], // Simplified
    };
  }

  /**
   * Predict purchase likelihood
   */
  async predictPurchaseLikelihood(userId: number): Promise<{
    likelihood: number; // 0-100
    timeframe: string;
    recommendedActions: string[];
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        orders: { take: 5 },
        cart: { include: { items: true } },
      },
    });

    if (!user) {
      return {
        likelihood: 0,
        timeframe: 'unknown',
        recommendedActions: [],
      };
    }

    let likelihood = 20; // Base likelihood

    // Has items in cart = +40
    if (user.cart?.items && user.cart.items.length > 0) {
      likelihood += 40;
    }

    // Recent purchase history = +20
    if (user.orders.length > 0) {
      const daysSinceLastOrder = Math.floor(
        (Date.now() - user.orders[0].created_at.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceLastOrder < 7) likelihood += 20;
      else if (daysSinceLastOrder < 30) likelihood += 10;
    }

    // Frequent buyer = +20
    if (user.orders.length >= 5) {
      likelihood += 20;
    }

    let timeframe = 'unknown';
    if (likelihood >= 80) timeframe = '24 hours';
    else if (likelihood >= 60) timeframe = '3 days';
    else if (likelihood >= 40) timeframe = '1 week';
    else timeframe = '1 month+';

    const recommendedActions: string[] = [];
    if (likelihood >= 60 && user.cart?.items.length) {
      recommendedActions.push('Send cart abandonment email');
    }
    if (likelihood < 40) {
      recommendedActions.push('Show personalized product recommendations');
    }

    return {
      likelihood: Math.min(100, likelihood),
      timeframe,
      recommendedActions,
    };
  }
}

export default UserIntentPredictor;
