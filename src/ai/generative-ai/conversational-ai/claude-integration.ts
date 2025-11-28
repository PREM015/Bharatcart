/**
 * Claude Integration (Anthropic)
 * Purpose: Advanced AI conversations with Claude
 * Features:
 * - Long context window (100k+ tokens)
 * - Constitutional AI (safer responses)
 * - Tool use
 * - Vision capabilities
 */

import Anthropic from '@anthropic-ai/sdk';
import { logger } from '@/lib/logger';

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class ClaudeIntegration {
  private client: Anthropic;
  private model = 'claude-3-opus-20240229';

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Send message to Claude
   */
  async chat(
    messages: ClaudeMessage[],
    systemPrompt?: string
  ): Promise<string> {
    logger.info('Claude conversation', { messageCount: messages.length });

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      });

      const textContent = response.content.find((c) => c.type === 'text');
      return textContent && 'text' in textContent ? textContent.text : '';
    } catch (error) {
      logger.error('Claude error', { error });
      throw error;
    }
  }

  /**
   * Stream response
   */
  async *streamChat(
    messages: ClaudeMessage[],
    systemPrompt?: string
  ): AsyncGenerator<string, void, unknown> {
    const stream = await this.client.messages.stream({
      model: this.model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
    }
  }

  /**
   * Analyze image with vision
   */
  async analyzeImage(imageUrl: string, prompt: string): Promise<string> {
    logger.info('Claude vision analysis', { imageUrl });

    const response = await this.client.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'url',
                url: imageUrl,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === 'text');
    return textContent && 'text' in textContent ? textContent.text : '';
  }
}

export default ClaudeIntegration;
