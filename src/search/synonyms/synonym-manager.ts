/**
 * Synonym Manager
 * Purpose: Manage search synonyms for better recall
 * Description: One-way and multi-way synonym support
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { TypesenseEngine } from '../engines/typesense';

export interface Synonym {
  id: string;
  root: string;
  synonyms: string[];
  type: 'one_way' | 'multi_way';
  locale?: string;
}

export class SynonymManager {
  private searchEngine: TypesenseEngine;
  private collectionName: string;

  constructor(searchEngine: TypesenseEngine, collectionName: string = 'products') {
    this.searchEngine = searchEngine;
    this.collectionName = collectionName;
  }

  async createSynonym(synonym: Synonym): Promise<void> {
    logger.info('Creating synonym', { id: synonym.id });

    await this.searchEngine.createSynonym(
      this.collectionName,
      synonym.id,
      [synonym.root, ...synonym.synonyms]
    );

    await prisma.searchSynonym.create({
      data: {
        id: synonym.id,
        root: synonym.root,
        synonyms: JSON.stringify(synonym.synonyms),
        type: synonym.type,
        locale: synonym.locale,
        created_at: new Date(),
      },
    });
  }

  async initializeDefaultSynonyms(): Promise<void> {
    const defaults: Synonym[] = [
      { id: 'phone', root: 'phone', synonyms: ['smartphone', 'mobile', 'cellphone'], type: 'multi_way' },
      { id: 'laptop', root: 'laptop', synonyms: ['notebook', 'ultrabook'], type: 'multi_way' },
      { id: 'tv', root: 'tv', synonyms: ['television', 'smart tv'], type: 'multi_way' },
      { id: 'cheap', root: 'cheap', synonyms: ['affordable', 'budget', 'inexpensive'], type: 'multi_way' },
    ];

    for (const syn of defaults) {
      try {
        await this.createSynonym(syn);
      } catch (error) {
        logger.error('Failed to create synonym', { syn, error });
      }
    }
  }

  async deleteSynonym(synonymId: string): Promise<void> {
    await prisma.searchSynonym.delete({ where: { id: synonymId } });
  }

  async getAllSynonyms(): Promise<Synonym[]> {
    const synonyms = await prisma.searchSynonym.findMany();
    return synonyms.map(s => ({
      id: s.id,
      root: s.root,
      synonyms: JSON.parse(s.synonyms),
      type: s.type as 'one_way' | 'multi_way',
      locale: s.locale || undefined,
    }));
  }
}

export default SynonymManager;
