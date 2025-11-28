/**
 * Product Embeddings
 * Purpose: Generate vector embeddings for products
 */

import OpenAI from 'openai';
import { logger } from '@/lib/logger';

export class ProductEmbeddings {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    logger.info('Generating product embedding');

    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    return response.data[0].embedding;
  }

  async generateProductEmbedding(product: {
    name: string;
    description: string;
    category: string;
  }): Promise<number[]> {
    const text = `${product.name} ${product.description} ${product.category}`;
    return this.generateEmbedding(text);
  }
}

export default ProductEmbeddings;
