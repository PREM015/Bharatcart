/**
 * ChatGPT Integration
 * Purpose: Advanced conversational AI using GPT-4 Turbo
 * Features:
 * - Multi-turn conversations
 * - Context retention
 * - Function calling
 * - Streaming responses
 * - Custom instructions
 */

import OpenAI from 'openai';
import { logger } from '@/lib/logger';
import { redis } from '@/lib/redis';

export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
  function_call?: any;
}

export interface ChatGPTConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  functions?: OpenAI.Chat.ChatCompletionCreateParams.Function[];
}

export class ChatGPTIntegration {
  private openai: OpenAI;
  private defaultModel = 'gpt-4-turbo-preview';

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Send message and get response
   */
  async chat(
    conversationId: string,
    userMessage: string,
    config: ChatGPTConfig = {}
  ): Promise<{ response: string; conversationId: string }> {
    logger.info('ChatGPT conversation', { conversationId, message: userMessage });

    try {
      // Load conversation history
      const history = await this.loadConversation(conversationId);

      // Add user message
      history.push({
        role: 'user',
        content: userMessage,
      });

      // Prepare messages with system prompt
      const messages: ConversationMessage[] = [];

      if (config.systemPrompt) {
        messages.push({
          role: 'system',
          content: config.systemPrompt,
        });
      }

      messages.push(...history);

      // Call ChatGPT
      const completion = await this.openai.chat.completions.create({
        model: config.model || this.defaultModel,
        messages: messages as any,
        temperature: config.temperature ?? 0.7,
        max_tokens: config.maxTokens ?? 1000,
        functions: config.functions,
        function_call: config.functions ? 'auto' : undefined,
      });

      const assistantMessage = completion.choices[0].message;

      // Add assistant response to history
      history.push({
        role: 'assistant',
        content: assistantMessage.content || '',
        function_call: assistantMessage.function_call,
      });

      // Save conversation
      await this.saveConversation(conversationId, history);

      return {
        response: assistantMessage.content || '',
        conversationId,
      };
    } catch (error) {
      logger.error('ChatGPT error', { error });
      throw error;
    }
  }

  /**
   * Stream chat response
   */
  async *streamChat(
    conversationId: string,
    userMessage: string,
    config: ChatGPTConfig = {}
  ): AsyncGenerator<string, void, unknown> {
    logger.info('ChatGPT streaming', { conversationId });

    const history = await this.loadConversation(conversationId);
    history.push({ role: 'user', content: userMessage });

    const messages: ConversationMessage[] = [];
    if (config.systemPrompt) {
      messages.push({ role: 'system', content: config.systemPrompt });
    }
    messages.push(...history);

    const stream = await this.openai.chat.completions.create({
      model: config.model || this.defaultModel,
      messages: messages as any,
      temperature: config.temperature ?? 0.7,
      max_tokens: config.maxTokens ?? 1000,
      stream: true,
    });

    let fullResponse = '';

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullResponse += content;
        yield content;
      }
    }

    // Save complete response
    history.push({ role: 'assistant', content: fullResponse });
    await this.saveConversation(conversationId, history);
  }

  /**
   * Execute function call
   */
  async executeFunction(
    functionName: string,
    args: Record<string, any>
  ): Promise<any> {
    logger.info('Executing function', { functionName, args });

    // Define available functions
    const functions: Record<string, Function> = {
      search_products: async (query: string) => {
        // Implementation
        return { results: [] };
      },
      get_order_status: async (orderId: string) => {
        // Implementation
        return { status: 'shipped' };
      },
      check_inventory: async (productId: string) => {
        // Implementation
        return { inStock: true, quantity: 50 };
      },
    };

    const func = functions[functionName];
    if (!func) {
      throw new Error(`Function ${functionName} not found`);
    }

    return await func(args);
  }

  /**
   * Create customer support agent
   */
  createSupportAgent(): ChatGPTConfig {
    return {
      model: 'gpt-4-turbo-preview',
      temperature: 0.7,
      systemPrompt: `You are a helpful and empathetic customer support agent for an e-commerce platform.

Your responsibilities:
- Answer customer questions about orders, products, shipping, and returns
- Be polite, professional, and understanding
- Provide accurate information
- Escalate complex issues when necessary
- Follow company policies

Available information:
- Order status and tracking
- Product catalog and specifications
- Shipping policies (3-5 business days standard, 1-2 days express)
- Return policy (30 days for most items)
- Customer account details

If you're unsure about something, ask clarifying questions or offer to escalate to a human agent.`,
      functions: [
        {
          name: 'search_products',
          description: 'Search for products in the catalog',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query' },
              category: { type: 'string', description: 'Product category' },
            },
            required: ['query'],
          },
        },
        {
          name: 'get_order_status',
          description: 'Get the status of an order',
          parameters: {
            type: 'object',
            properties: {
              orderId: { type: 'string', description: 'Order ID' },
            },
            required: ['orderId'],
          },
        },
      ],
    };
  }

  /**
   * Create shopping assistant
   */
  createShoppingAssistant(): ChatGPTConfig {
    return {
      model: 'gpt-4-turbo-preview',
      temperature: 0.8,
      systemPrompt: `You are a friendly and knowledgeable shopping assistant.

Your role:
- Help customers find the perfect products
- Provide personalized recommendations
- Answer product questions
- Compare different options
- Suggest complementary items

Be enthusiastic but not pushy. Focus on understanding customer needs and providing value.`,
      functions: [
        {
          name: 'search_products',
          description: 'Search for products',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string' },
              filters: {
                type: 'object',
                properties: {
                  category: { type: 'string' },
                  priceRange: {
                    type: 'object',
                    properties: {
                      min: { type: 'number' },
                      max: { type: 'number' },
                    },
                  },
                },
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'get_recommendations',
          description: 'Get personalized product recommendations',
          parameters: {
            type: 'object',
            properties: {
              based_on: { type: 'string', description: 'What to base recommendations on' },
              limit: { type: 'number', description: 'Number of recommendations' },
            },
          },
        },
      ],
    };
  }

  /**
   * Load conversation history
   */
  private async loadConversation(conversationId: string): Promise<ConversationMessage[]> {
    const key = `conversation:${conversationId}`;
    const data = await redis.get(key);
    return data ? JSON.parse(data) : [];
  }

  /**
   * Save conversation history
   */
  private async saveConversation(
    conversationId: string,
    messages: ConversationMessage[]
  ): Promise<void> {
    const key = `conversation:${conversationId}`;
    // Keep last 20 messages to manage context window
    const trimmed = messages.slice(-20);
    await redis.setex(key, 3600, JSON.stringify(trimmed)); // 1 hour TTL
  }

  /**
   * Clear conversation
   */
  async clearConversation(conversationId: string): Promise<void> {
    const key = `conversation:${conversationId}`;
    await redis.del(key);
  }

  /**
   * Get conversation summary
   */
  async summarizeConversation(conversationId: string): Promise<string> {
    const history = await this.loadConversation(conversationId);

    if (history.length === 0) {
      return 'No conversation history';
    }

    const conversationText = history
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join('
');

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'Summarize the following conversation in 2-3 sentences.',
        },
        { role: 'user', content: conversationText },
      ],
      max_tokens: 150,
    });

    return completion.choices[0].message.content || '';
  }
}

export default ChatGPTIntegration;
