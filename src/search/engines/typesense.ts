/**
 * Typesense Search Engine Integration
 * Purpose: Fast, typo-tolerant open-source search engine
 * Description: Full-featured search with instant results, typo tolerance, and faceting
 * 
 * Features:
 * - Typo tolerance out of the box
 * - Sub-50ms search latency
 * - Faceted search & filtering
 * - Geo search capabilities
 * - Federated/multi-search
 * - Dynamic sorting
 * - Synonym support
 * - Vector search (semantic)
 * 
 * Use Cases:
 * - E-commerce product search
 * - Real-time autocomplete
 * - Faceted navigation
 * - Geographic search
 * 
 * @see https://typesense.org/docs/
 */

import { logger } from '@/lib/logger';
import Typesense from 'typesense';

export interface TypesenseConfig {
  nodes: Array<{
    host: string;
    port: number;
    protocol: 'http' | 'https';
  }>;
  apiKey: string;
  connectionTimeoutSeconds?: number;
  numRetries?: number;
  retryIntervalSeconds?: number;
}

export interface TypesenseDocument {
  id: string;
  [key: string]: any;
}

export interface CollectionSchema {
  name: string;
  fields: CollectionField[];
  default_sorting_field?: string;
  enable_nested_fields?: boolean;
}

export interface CollectionField {
  name: string;
  type: string;
  facet?: boolean;
  optional?: boolean;
  index?: boolean;
  sort?: boolean;
  infix?: boolean;
  locale?: string;
}

export interface SearchParams {
  q: string;
  query_by: string;
  query_by_weights?: string;
  prefix?: boolean | string;
  filter_by?: string;
  sort_by?: string;
  facet_by?: string;
  max_facet_values?: number;
  facet_query?: string;
  num_typos?: number | string;
  page?: number;
  per_page?: number;
  group_by?: string;
  group_limit?: number;
  include_fields?: string;
  exclude_fields?: string;
  highlight_fields?: string;
  highlight_full_fields?: string;
  highlight_affix_num_tokens?: number;
  snippet_threshold?: number;
  drop_tokens_threshold?: number;
  typo_tokens_threshold?: number;
  pinned_hits?: string;
  hidden_hits?: string;
  limit_hits?: number;
  pre_segmented_query?: boolean;
  enable_overrides?: boolean;
  prioritize_exact_match?: boolean;
  search_cutoff_ms?: number;
  exhaustive_search?: boolean;
  max_candidates?: number;
}

export interface SearchResult<T = any> {
  facet_counts?: FacetCount[];
  found: number;
  hits?: SearchHit<T>[];
  out_of: number;
  page: number;
  request_params: any;
  search_cutoff: boolean;
  search_time_ms: number;
}

export interface SearchHit<T = any> {
  document: T;
  highlight?: Record<string, any>;
  highlights?: Array<{
    field: string;
    matched_tokens: string[];
    snippet?: string;
  }>;
  text_match: number;
  text_match_info?: {
    best_field_score: string;
    best_field_weight: number;
    fields_matched: number;
    num_tokens_dropped: number;
    score: string;
    tokens_matched: number;
  };
}

export interface FacetCount {
  field_name: string;
  counts: Array<{
    count: number;
    highlighted: string;
    value: string;
  }>;
  stats?: {
    avg?: number;
    max?: number;
    min?: number;
    sum?: number;
    total_values?: number;
  };
}

export class TypesenseEngine {
  private client: Typesense.Client;
  private config: TypesenseConfig;

  constructor(config: TypesenseConfig) {
    this.config = config;
    
    this.client = new Typesense.Client({
      nodes: config.nodes,
      apiKey: config.apiKey,
      connectionTimeoutSeconds: config.connectionTimeoutSeconds || 2,
      numRetries: config.numRetries || 3,
      retryIntervalSeconds: config.retryIntervalSeconds || 1,
    });

    logger.info('Typesense client initialized', {
      nodes: config.nodes.length,
    });
  }

  /**
   * Create collection with schema
   * 
   * @param schema - Collection schema definition
   * @throws Error if collection creation fails
   * 
   * @example
   * ```typescript
   * await engine.createCollection({
   *   name: 'products',
   *   fields: [
   *     { name: 'id', type: 'string' },
   *     { name: 'name', type: 'string' },
   *     { name: 'price', type: 'float', facet: true }
   *   ],
   *   default_sorting_field: 'price'
   * });
   * ```
   */
  async createCollection(schema: CollectionSchema): Promise<void> {
    logger.info('Creating Typesense collection', { name: schema.name });

    try {
      await this.client.collections().create(schema);
      
      logger.info('Collection created successfully', { name: schema.name });
    } catch (error: any) {
      if (error.httpStatus === 409) {
        logger.warn('Collection already exists', { name: schema.name });
        return;
      }
      
      logger.error('Failed to create collection', {
        name: schema.name,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get collection information
   */
  async getCollection(collectionName: string): Promise<any> {
    try {
      return await this.client.collections(collectionName).retrieve();
    } catch (error: any) {
      logger.error('Failed to retrieve collection', {
        collection: collectionName,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * List all collections
   */
  async listCollections(): Promise<any[]> {
    try {
      const response = await this.client.collections().retrieve();
      return response;
    } catch (error: any) {
      logger.error('Failed to list collections', { error: error.message });
      throw error;
    }
  }

  /**
   * Update collection schema
   */
  async updateCollection(
    collectionName: string,
    schema: Partial<CollectionSchema>
  ): Promise<void> {
    logger.info('Updating collection schema', { collection: collectionName });

    try {
      await this.client.collections(collectionName).update(schema);
      
      logger.info('Collection updated successfully', { collection: collectionName });
    } catch (error: any) {
      logger.error('Failed to update collection', {
        collection: collectionName,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Delete collection
   */
  async deleteCollection(collectionName: string): Promise<void> {
    logger.info('Deleting collection', { name: collectionName });

    try {
      await this.client.collections(collectionName).delete();
      
      logger.info('Collection deleted successfully', { name: collectionName });
    } catch (error: any) {
      logger.error('Failed to delete collection', {
        collection: collectionName,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Index single document
   * 
   * @param collectionName - Name of the collection
   * @param document - Document to index
   * @param action - 'create', 'update', or 'upsert' (default: 'upsert')
   */
  async indexDocument(
    collectionName: string,
    document: TypesenseDocument,
    action: 'create' | 'update' | 'upsert' = 'upsert'
  ): Promise<void> {
    logger.debug('Indexing document', {
      collection: collectionName,
      id: document.id,
      action,
    });

    try {
      if (action === 'upsert') {
        await this.client
          .collections(collectionName)
          .documents()
          .upsert(document);
      } else if (action === 'create') {
        await this.client
          .collections(collectionName)
          .documents()
          .create(document);
      } else if (action === 'update') {
        await this.client
          .collections(collectionName)
          .documents(document.id)
          .update(document);
      }
    } catch (error: any) {
      logger.error('Failed to index document', {
        collection: collectionName,
        id: document.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Bulk index documents
   * 
   * @param collectionName - Name of the collection
   * @param documents - Array of documents to index
   * @param action - Import action (default: 'upsert')
   * @param batchSize - Number of documents per batch (default: 100)
   * 
   * @returns Import results with success/error counts
   * 
   * @example
   * ```typescript
   * const results = await engine.bulkIndex('products', documents);
   * console.log(`Indexed: ${results.num_imported}, Failed: ${results.num_failed}`);
   * ```
   */
  async bulkIndex(
    collectionName: string,
    documents: TypesenseDocument[],
    action: 'create' | 'update' | 'upsert' = 'upsert',
    batchSize: number = 100
  ): Promise<{
    num_imported: number;
    num_failed: number;
    errors: any[];
  }> {
    logger.info('Bulk indexing documents', {
      collection: collectionName,
      count: documents.length,
      batch_size: batchSize,
    });

    let totalImported = 0;
    let totalFailed = 0;
    const allErrors: any[] = [];

    // Process in batches
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);

      try {
        const results = await this.client
          .collections(collectionName)
          .documents()
          .import(batch, { action });

        // Parse results
        const resultLines = results.split('
').filter(line => line.trim());
        
        resultLines.forEach((line, index) => {
          try {
            const result = JSON.parse(line);
            if (result.success) {
              totalImported++;
            } else {
              totalFailed++;
              allErrors.push({
                document_id: batch[index]?.id,
                error: result.error,
              });
            }
          } catch (parseError) {
            logger.error('Failed to parse import result', { line });
          }
        });

        logger.debug('Batch processed', {
          batch: Math.floor(i / batchSize) + 1,
          imported: totalImported,
          failed: totalFailed,
        });
      } catch (error: any) {
        logger.error('Batch import failed', {
          batch: Math.floor(i / batchSize) + 1,
          error: error.message,
        });
        totalFailed += batch.length;
      }
    }

    logger.info('Bulk indexing completed', {
      collection: collectionName,
      total: documents.length,
      imported: totalImported,
      failed: totalFailed,
    });

    return {
      num_imported: totalImported,
      num_failed: totalFailed,
      errors: allErrors,
    };
  }

  /**
   * Search documents
   * 
   * @param collectionName - Name of the collection to search
   * @param searchParams - Search parameters
   * 
   * @example
   * ```typescript
   * const results = await engine.search('products', {
   *   q: 'laptop',
   *   query_by: 'name,description',
   *   filter_by: 'price:[100..500]',
   *   sort_by: 'popularity:desc',
   *   facet_by: 'brand,category',
   *   per_page: 20
   * });
   * ```
   */
  async search<T = any>(
    collectionName: string,
    searchParams: SearchParams
  ): Promise<SearchResult<T>> {
    logger.debug('Searching collection', {
      collection: collectionName,
      query: searchParams.q,
    });

    const startTime = Date.now();

    try {
      const results = await this.client
        .collections(collectionName)
        .documents()
        .search(searchParams as any);

      const duration = Date.now() - startTime;

      logger.debug('Search completed', {
        collection: collectionName,
        found: results.found,
        duration_ms: duration,
      });

      return results as SearchResult<T>;
    } catch (error: any) {
      logger.error('Search failed', {
        collection: collectionName,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Multi-search across multiple collections
   * 
   * @param searches - Array of search requests
   * 
   * @example
   * ```typescript
   * const results = await engine.multiSearch([
   *   { collection: 'products', q: 'laptop', query_by: 'name' },
   *   { collection: 'categories', q: 'electronics', query_by: 'name' }
   * ]);
   * ```
   */
  async multiSearch(
    searches: Array<{ collection: string } & SearchParams>
  ): Promise<{ results: SearchResult[] }> {
    logger.info('Multi-search', { count: searches.length });

    try {
      const results = await this.client.multiSearch.perform(
        { searches: searches as any },
        {}
      );

      return results;
    } catch (error: any) {
      logger.error('Multi-search failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get document by ID
   */
  async getDocument<T = any>(
    collectionName: string,
    documentId: string
  ): Promise<T> {
    try {
      const document = await this.client
        .collections(collectionName)
        .documents(documentId)
        .retrieve();

      return document as T;
    } catch (error: any) {
      logger.error('Failed to retrieve document', {
        collection: collectionName,
        id: documentId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Update document
   */
  async updateDocument(
    collectionName: string,
    documentId: string,
    updates: Partial<TypesenseDocument>
  ): Promise<void> {
    logger.debug('Updating document', {
      collection: collectionName,
      id: documentId,
    });

    try {
      await this.client
        .collections(collectionName)
        .documents(documentId)
        .update(updates);
    } catch (error: any) {
      logger.error('Failed to update document', {
        collection: collectionName,
        id: documentId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Delete document
   */
  async deleteDocument(collectionName: string, documentId: string): Promise<void> {
    logger.debug('Deleting document', {
      collection: collectionName,
      id: documentId,
    });

    try {
      await this.client
        .collections(collectionName)
        .documents(documentId)
        .delete();
    } catch (error: any) {
      logger.error('Failed to delete document', {
        collection: collectionName,
        id: documentId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Delete documents by query
   * 
   * @param collectionName - Collection name
   * @param filterBy - Filter query to match documents to delete
   * @param batchSize - Number of documents to delete per batch
   * 
   * @example
   * ```typescript
   * // Delete all out of stock products
   * await engine.deleteByQuery('products', 'in_stock:=false');
   * ```
   */
  async deleteByQuery(
    collectionName: string,
    filterBy: string,
    batchSize: number = 100
  ): Promise<number> {
    logger.info('Deleting documents by query', {
      collection: collectionName,
      filter: filterBy,
    });

    try {
      const result = await this.client
        .collections(collectionName)
        .documents()
        .delete({ filter_by: filterBy, batch_size: batchSize });

      logger.info('Documents deleted', {
        collection: collectionName,
        count: result.num_deleted,
      });

      return result.num_deleted;
    } catch (error: any) {
      logger.error('Failed to delete by query', {
        collection: collectionName,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Create or update synonym
   * 
   * @param collectionName - Collection name
   * @param synonymId - Unique ID for the synonym
   * @param synonyms - Array of synonym terms
   * 
   * @example
   * ```typescript
   * await engine.createSynonym('products', 'phone_syn', [
   *   'phone', 'smartphone', 'mobile', 'cellphone'
   * ]);
   * ```
   */
  async createSynonym(
    collectionName: string,
    synonymId: string,
    synonyms: string[]
  ): Promise<void> {
    logger.info('Creating synonym', {
      collection: collectionName,
      id: synonymId,
    });

    try {
      await this.client
        .collections(collectionName)
        .synonyms()
        .upsert(synonymId, { synonyms });

      logger.info('Synonym created successfully', {
        collection: collectionName,
        id: synonymId,
      });
    } catch (error: any) {
      logger.error('Failed to create synonym', {
        collection: collectionName,
        id: synonymId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get synonym
   */
  async getSynonym(collectionName: string, synonymId: string): Promise<any> {
    try {
      return await this.client
        .collections(collectionName)
        .synonyms(synonymId)
        .retrieve();
    } catch (error: any) {
      logger.error('Failed to retrieve synonym', {
        collection: collectionName,
        id: synonymId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * List all synonyms
   */
  async listSynonyms(collectionName: string): Promise<any[]> {
    try {
      const response = await this.client
        .collections(collectionName)
        .synonyms()
        .retrieve();

      return response.synonyms || [];
    } catch (error: any) {
      logger.error('Failed to list synonyms', {
        collection: collectionName,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Delete synonym
   */
  async deleteSynonym(collectionName: string, synonymId: string): Promise<void> {
    logger.info('Deleting synonym', {
      collection: collectionName,
      id: synonymId,
    });

    try {
      await this.client
        .collections(collectionName)
        .synonyms(synonymId)
        .delete();
    } catch (error: any) {
      logger.error('Failed to delete synonym', {
        collection: collectionName,
        id: synonymId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get autocomplete suggestions
   * 
   * @param collectionName - Collection name
   * @param query - Partial query string
   * @param field - Field to get suggestions from
   * @param limit - Maximum number of suggestions
   */
  async getSuggestions(
    collectionName: string,
    query: string,
    field: string,
    limit: number = 5
  ): Promise<string[]> {
    const results = await this.search(collectionName, {
      q: query,
      query_by: field,
      per_page: limit,
      prefix: true,
    });

    return (
      results.hits?.map((hit: any) => hit.document[field]).filter(Boolean) || []
    );
  }

  /**
   * Get collection statistics
   */
  async getStats(collectionName: string): Promise<{
    num_documents: number;
    num_memory_shards: number;
    [key: string]: any;
  }> {
    try {
      const collection = await this.client
        .collections(collectionName)
        .retrieve();

      return {
        num_documents: collection.num_documents,
        num_memory_shards: collection.num_memory_shards,
        ...collection,
      };
    } catch (error: any) {
      logger.error('Failed to get collection stats', {
        collection: collectionName,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const health = await this.client.health.retrieve();
      return health.ok === true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get API stats
   */
  async getAPIStats(): Promise<any> {
    try {
      return await this.client.stats.retrieve();
    } catch (error: any) {
      logger.error('Failed to get API stats', { error: error.message });
      throw error;
    }
  }
}

export default TypesenseEngine;
