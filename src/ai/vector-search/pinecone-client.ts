/**
 * Pinecone Vector Database Client
 * Purpose: Similarity search using Pinecone
 */

import { Pinecone } from '@pinecone-database/pinecone';
import { logger } from '@/lib/logger';

export class PineconeClient {
  private client: Pinecone;
  private indexName: string;

  constructor() {
    this.client = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY || '',
    });
    this.indexName = process.env.PINECONE_INDEX || 'products';
  }

  async upsertVectors(vectors: Array<{
    id: string;
    values: number[];
    metadata?: Record<string, any>;
  }>): Promise<void> {
    logger.info('Upserting vectors to Pinecone', { count: vectors.length });

    const index = this.client.index(this.indexName);
    await index.upsert(vectors);
  }

  async searchSimilar(
    vector: number[],
    topK: number = 10,
    filter?: Record<string, any>
  ): Promise<any[]> {
    logger.info('Searching similar vectors', { topK });

    const index = this.client.index(this.indexName);
    const results = await index.query({
      vector,
      topK,
      filter,
      includeMetadata: true,
    });

    return results.matches || [];
  }

  async deleteVectors(ids: string[]): Promise<void> {
    const index = this.client.index(this.indexName);
    await index.deleteMany(ids);
  }
}

export default PineconeClient;
