/**
 * Weaviate Vector Database Client
 * Purpose: Semantic search using Weaviate
 */

import weaviate, { WeaviateClient } from 'weaviate-ts-client';
import { logger } from '@/lib/logger';

export class WeaviateVectorClient {
  private client: WeaviateClient;

  constructor() {
    this.client = weaviate.client({
      scheme: 'http',
      host: process.env.WEAVIATE_HOST || 'localhost:8080',
    });
  }

  async createSchema(className: string, properties: any[]): Promise<void> {
    logger.info('Creating Weaviate schema', { className });

    await this.client.schema
      .classCreator()
      .withClass({
        class: className,
        properties,
        vectorizer: 'text2vec-openai',
      })
      .do();
  }

  async addObject(className: string, object: any): Promise<string> {
    const result = await this.client.data
      .creator()
      .withClassName(className)
      .withProperties(object)
      .do();

    return result.id;
  }

  async searchSimilar(
    className: string,
    query: string,
    limit: number = 10
  ): Promise<any[]> {
    logger.info('Searching Weaviate', { className, query });

    const result = await this.client.graphql
      .get()
      .withClassName(className)
      .withNearText({ concepts: [query] })
      .withLimit(limit)
      .do();

    return result.data?.Get?.[className] || [];
  }
}

export default WeaviateVectorClient;
