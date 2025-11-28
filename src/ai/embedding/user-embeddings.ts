/**
 * User Embeddings
 * Purpose: Generate vector embeddings for user preferences
 */

import OpenAI from 'openai';

export class UserEmbeddings {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateUserEmbedding(
    viewedProducts: string[],
    purchasedProducts: string[]
  ): Promise<number[]> {
    const text = [...viewedProducts, ...purchasedProducts].join(' ');
    
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    return response.data[0].embedding;
  }
}

export default UserEmbeddings;
