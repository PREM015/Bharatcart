/**
 * AI Customer Service Agent
 * Purpose: Automated customer support using GPT-4
 * Features:
 * - Natural language understanding
 * - Order status queries
 * - Product recommendations
 * - Issue resolution
 * - Escalation to human agents
 * 
 * @example
 * ```typescript
 * const agent = new CustomerServiceAgent();
 * const response = await agent.handleQuery(
 *   "Where is my order #12345?",
 *   userId
 * );
 * ```
 */

import OpenAI from 'openai';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

export interface AgentContext {
  userId?: number;
  sessionId: string;
  conversationHistory: Message[];
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface AgentResponse {
  message: string;
  intent: string;
  confidence: number;
  actions?: Array<{
    type: string;
    data: any;
  }>;
  needsHumanEscalation: boolean;
}

export class CustomerServiceAgent {
  private openai: OpenAI;
  private systemPrompt = `You are a helpful customer service agent for an e-commerce platform.
Your role is to:
- Answer customer questions about orders, products, shipping, and returns
- Be polite, professional, and empathetic
- Provide accurate information based on the context
- Escalate complex issues to human agents when necessary

You have access to:
- Order information
- Product catalog
- Shipping policies
- Return policies

When you need to perform an action (like checking order status), indicate it in your response.`;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Handle customer query
   */
  async handleQuery(
    query: string,
    context: AgentContext
  ): Promise<AgentResponse> {
    logger.info('Processing customer service query', { query, context });

    try {
      // Enrich context with user data
      const enrichedContext = await this.enrichContext(context);

      // Build messages for GPT
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: this.systemPrompt },
        { role: 'system', content: `User Context: ${JSON.stringify(enrichedContext)}` },
        ...context.conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        { role: 'user', content: query },
      ];

      // Call GPT-4
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages,
        temperature: 0.7,
        max_tokens: 500,
        functions: this.getFunctions(),
        function_call: 'auto',
      });

      const response = completion.choices[0].message;

      // Parse response
      const intent = await this.detectIntent(query);
      const needsEscalation = this.shouldEscalate(response.content || '');

      // Execute function calls if any
      const actions = [];
      if (response.function_call) {
        const action = await this.executeFunctionCall(
          response.function_call.name,
          JSON.parse(response.function_call.arguments || '{}')
        );
        actions.push(action);
      }

      // Save conversation
      await this.saveConversation(context.sessionId, query, response.content || '');

      return {
        message: response.content || 'I apologize, but I need more information to help you.',
        intent,
        confidence: 0.85,
        actions: actions.length > 0 ? actions : undefined,
        needsHumanEscalation: needsEscalation,
      };
    } catch (error) {
      logger.error('Customer service agent error', { error });
      
      return {
        message: 'I apologize, but I encountered an error. Let me connect you with a human agent.',
        intent: 'error',
        confidence: 0,
        needsHumanEscalation: true,
      };
    }
  }

  /**
   * Enrich context with user data
   */
  private async enrichContext(context: AgentContext): Promise<any> {
    if (!context.userId) {
      return { isGuest: true };
    }

    const user = await prisma.user.findUnique({
      where: { id: context.userId },
      include: {
        orders: {
          take: 5,
          orderBy: { created_at: 'desc' },
        },
      },
    });

    return {
      userName: user?.name,
      email: user?.email,
      recentOrders: user?.orders.map(o => ({
        id: o.id,
        status: o.status,
        total: o.total / 100,
        createdAt: o.created_at,
      })),
    };
  }

  /**
   * Define available functions
   */
  private getFunctions(): OpenAI.Chat.ChatCompletionCreateParams.Function[] {
    return [
      {
        name: 'check_order_status',
        description: 'Check the status of an order',
        parameters: {
          type: 'object',
          properties: {
            orderId: {
              type: 'string',
              description: 'The order ID to check',
            },
          },
          required: ['orderId'],
        },
      },
      {
        name: 'search_products',
        description: 'Search for products',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'initiate_return',
        description: 'Start a return process',
        parameters: {
          type: 'object',
          properties: {
            orderId: {
              type: 'string',
              description: 'The order ID to return',
            },
            reason: {
              type: 'string',
              description: 'Reason for return',
            },
          },
          required: ['orderId', 'reason'],
        },
      },
    ];
  }

  /**
   * Execute function call
   */
  private async executeFunctionCall(
    functionName: string,
    args: any
  ): Promise<{ type: string; data: any }> {
    switch (functionName) {
      case 'check_order_status':
        const order = await prisma.order.findUnique({
          where: { id: parseInt(args.orderId) },
        });
        return {
          type: 'order_status',
          data: {
            orderId: order?.id,
            status: order?.status,
            tracking: order?.tracking_number,
          },
        };

      case 'search_products':
        const products = await prisma.product.findMany({
          where: {
            OR: [
              { name: { contains: args.query } },
              { description: { contains: args.query } },
            ],
          },
          take: 5,
        });
        return {
          type: 'product_search',
          data: products,
        };

      default:
        return { type: 'unknown', data: null };
    }
  }

  /**
   * Detect user intent
   */
  private async detectIntent(query: string): Promise<string> {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('order') || lowerQuery.includes('tracking')) {
      return 'order_inquiry';
    }
    if (lowerQuery.includes('return') || lowerQuery.includes('refund')) {
      return 'return_request';
    }
    if (lowerQuery.includes('product') || lowerQuery.includes('looking for')) {
      return 'product_search';
    }
    if (lowerQuery.includes('shipping') || lowerQuery.includes('delivery')) {
      return 'shipping_inquiry';
    }

    return 'general_inquiry';
  }

  /**
   * Determine if escalation needed
   */
  private shouldEscalate(response: string): boolean {
    const escalationKeywords = [
      'escalate',
      'human agent',
      'supervisor',
      'cannot help',
      'complex issue',
    ];

    return escalationKeywords.some(keyword =>
      response.toLowerCase().includes(keyword)
    );
  }

  /**
   * Save conversation
   */
  private async saveConversation(
    sessionId: string,
    query: string,
    response: string
  ): Promise<void> {
    await prisma.conversation.create({
      data: {
        session_id: sessionId,
        user_message: query,
        agent_message: response,
        created_at: new Date(),
      },
    });
  }
}

export default CustomerServiceAgent;
