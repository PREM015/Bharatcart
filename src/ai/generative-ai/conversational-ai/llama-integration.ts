/**
 * LLaMA Integration (Meta)
 * Purpose: Open-source LLM integration
 * Features:
 * - Self-hosted or via Replicate
 * - Cost-effective
 * - Customizable
 */

import axios from 'axios';
import { logger } from '@/lib/logger';

export class LlamaIntegration {
  private apiUrl: string;

  constructor() {
    this.apiUrl = process.env.LLAMA_API_URL || 'http://localhost:11434';
  }

  /**
   * Chat with LLaMA
   */
  async chat(prompt: string, context?: string[]): Promise<string> {
    logger.info('LLaMA chat', { prompt });

    try {
      const response = await axios.post(`${this.apiUrl}/api/generate`, {
        model: 'llama2',
        prompt,
        context,
        stream: false,
      });

      return response.data.response;
    } catch (error) {
      logger.error('LLaMA error', { error });
      throw error;
    }
  }
}

export default LlamaIntegration;
