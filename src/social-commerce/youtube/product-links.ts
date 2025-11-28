/**
 * YouTube Product Links
 * Purpose: Manage product links in YouTube content
 * Description: Description links, pinned comments, cards
 */

import { logger } from '@/lib/logger';
import axios from 'axios';

export class YouTubeProductLinks {
  private accessToken: string;
  private baseUrl = 'https://www.googleapis.com/youtube/v3';

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Add product links to video description
   */
  async updateVideoDescription(
    videoId: string,
    description: string,
    productLinks: Array<{ title: string; url: string }>
  ): Promise<void> {
    logger.info('Updating video description with product links', { video_id: videoId });

    const linksSection = '

🛍️ SHOP THE VIDEO:
' +
      productLinks.map(link => `• ${link.title}: ${link.url}`).join('
');

    const fullDescription = description + linksSection;

    const url = `${this.baseUrl}/videos`;

    await axios.put(
      url,
      {
        id: videoId,
        snippet: {
          description: fullDescription,
        },
      },
      {
        params: {
          part: 'snippet',
        },
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );
  }

  /**
   * Create pinned comment with products
   */
  async createPinnedProductComment(
    videoId: string,
    products: Array<{ title: string; url: string }>
  ): Promise<void> {
    logger.info('Creating pinned product comment', { video_id: videoId });

    const commentText = '🛍️ Products featured in this video:

' +
      products.map(p => `• ${p.title}
  ${p.url}`).join('

');

    // Create comment
    const createUrl = `${this.baseUrl}/commentThreads`;

    const response = await axios.post(
      createUrl,
      {
        snippet: {
          videoId,
          topLevelComment: {
            snippet: {
              textOriginal: commentText,
            },
          },
        },
      },
      {
        params: {
          part: 'snippet',
        },
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );

    // Pin comment
    const commentId = response.data.id;
    const pinUrl = `${this.baseUrl}/comments/setModerationStatus`;

    await axios.post(
      pinUrl,
      {},
      {
        params: {
          id: commentId,
          moderationStatus: 'published',
          banAuthor: false,
        },
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );
  }
}

export default YouTubeProductLinks;
