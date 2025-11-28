/**
 * Chat Bot
 * Purpose: Automated responses and basic support
 */

import { logger } from '@/lib/logger';

export interface Intent {
  name: string;
  patterns: string[];
  responses: string[];
  action?: string;
}

export class ChatBot {
  private intents: Intent[];

  constructor() {
    this.intents = this.loadIntents();
  }

  /**
   * Load predefined intents
   */
  private loadIntents(): Intent[] {
    return [
      {
        name: 'greeting',
        patterns: ['hi', 'hello', 'hey', 'good morning', 'good afternoon'],
        responses: [
          'Hello! How can I help you today?',
          'Hi there! What can I do for you?',
          'Hey! How may I assist you?',
        ],
      },
      {
        name: 'order_status',
        patterns: ['order status', 'where is my order', 'track order', 'order tracking'],
        responses: [
          'I can help you track your order. Please provide your order number.',
        ],
        action: 'track_order',
      },
      {
        name: 'returns',
        patterns: ['return', 'refund', 'exchange', 'send back'],
        responses: [
          'I can help you with returns. We offer 30-day returns on most items.',
          'Our return policy allows returns within 30 days of purchase.',
        ],
        action: 'initiate_return',
      },
      {
        name: 'shipping',
        patterns: ['shipping', 'delivery', 'how long', 'when will i receive'],
        responses: [
          'Standard shipping takes 5-7 business days. Express shipping is 2-3 days.',
          'We offer free shipping on orders over $50.',
        ],
      },
      {
        name: 'payment',
        patterns: ['payment', 'pay', 'credit card', 'payment methods'],
        responses: [
          'We accept all major credit cards, PayPal, and Apple Pay.',
          'Your payment is secure and encrypted.',
        ],
      },
      {
        name: 'human_agent',
        patterns: ['talk to human', 'speak to agent', 'representative', 'live agent'],
        responses: [
          'Let me connect you with a live agent. One moment please.',
        ],
        action: 'transfer_to_agent',
      },
    ];
  }

  /**
   * Process user message
   */
  async processMessage(message: string): Promise<{
    response: string;
    intent?: string;
    action?: string;
    confidence: number;
  }> {
    logger.info('Processing bot message', { message });

    const normalizedMessage = message.toLowerCase().trim();

    // Find matching intent
    for (const intent of this.intents) {
      for (const pattern of intent.patterns) {
        if (normalizedMessage.includes(pattern)) {
          const response = this.getRandomResponse(intent.responses);
          
          return {
            response,
            intent: intent.name,
            action: intent.action,
            confidence: 0.8,
          };
        }
      }
    }

    // Default response
    return {
      response: "I'm not sure I understand. Would you like to speak with a live agent?",
      confidence: 0.3,
    };
  }

  /**
   * Get random response from array
   */
  private getRandomResponse(responses: string[]): string {
    return responses[Math.floor(Math.random() * responses.length)];
  }

  /**
   * Extract entities from message
   */
  extractEntities(message: string): Record<string, any> {
    const entities: Record<string, any> = {};

    // Extract order number (format: #12345)
    const orderMatch = message.match(/#(\d+)/);
    if (orderMatch) {
      entities.orderId = orderMatch[1];
    }

    // Extract email
    const emailMatch = message.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}/);
    if (emailMatch) {
      entities.email = emailMatch[0];
    }

    // Extract phone number
    const phoneMatch = message.match(/\d{10}/);
    if (phoneMatch) {
      entities.phone = phoneMatch[0];
    }

    return entities;
  }

  /**
   * Add custom intent
   */
  addIntent(intent: Intent): void {
    this.intents.push(intent);
    logger.info('Intent added', { name: intent.name });
  }
}

export default ChatBot;
