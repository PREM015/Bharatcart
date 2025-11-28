/**
 * Instagram Story Shopping Links
 * Purpose: Add shopping links to Instagram Stories
 * Description: Story stickers, swipe-up links, product links
 */

import { logger } from '@/lib/logger';
import axios from 'axios';

export interface StoryProductSticker {
  product_id: string;
  x: number; // 0-1
  y: number; // 0-1
  width: number; // 0-1
  height: number; // 0-1
  rotation: number; // degrees
}

export interface StoryLink {
  url: string;
  type: 'SWIPE_UP' | 'STICKER';
}

export class InstagramStoryLinks {
  private accessToken: string;
  private businessAccountId: string;
  private baseUrl = 'https://graph.facebook.com/v18.0';

  constructor(accessToken: string, businessAccountId: string) {
    this.accessToken = accessToken;
    this.businessAccountId = businessAccountId;
  }

  /**
   * Create story with product sticker
   */
  async createStoryWithProductSticker(
    mediaUrl: string,
    sticker: StoryProductSticker
  ): Promise<string> {
    logger.info('Creating story with product sticker', {
      product_id: sticker.product_id,
    });

    try {
      // Upload story media
      const mediaId = await this.uploadStoryMedia(mediaUrl);

      // Add product sticker
      await this.addProductSticker(mediaId, sticker);

      // Publish story
      const storyId = await this.publishStory(mediaId);

      return storyId;
    } catch (error: any) {
      logger.error('Failed to create story', {
        error: error.response?.data || error.message,
      });
      throw error;
    }
  }

  /**
   * Upload story media
   */
  private async uploadStoryMedia(mediaUrl: string): Promise<string> {
    const url = `${this.baseUrl}/${this.businessAccountId}/media`;

    const response = await axios.post(
      url,
      {
        image_url: mediaUrl,
        media_type: 'STORIES',
      },
      {
        params: {
          access_token: this.accessToken,
        },
      }
    );

    return response.data.id;
  }

  /**
   * Add product sticker to story
   */
  private async addProductSticker(
    mediaId: string,
    sticker: StoryProductSticker
  ): Promise<void> {
    const url = `${this.baseUrl}/${mediaId}`;

    await axios.post(
      url,
      {
        story_product_sticker: {
          product_id: sticker.product_id,
          x: sticker.x,
          y: sticker.y,
          width: sticker.width,
          height: sticker.height,
          rotation: sticker.rotation,
        },
      },
      {
        params: {
          access_token: this.accessToken,
        },
      }
    );
  }

  /**
   * Publish story
   */
  private async publishStory(mediaId: string): Promise<string> {
    const url = `${this.baseUrl}/${this.businessAccountId}/media_publish`;

    const response = await axios.post(
      url,
      {
        creation_id: mediaId,
      },
      {
        params: {
          access_token: this.accessToken,
        },
      }
    );

    return response.data.id;
  }

  /**
   * Add swipe-up link (requires 10k+ followers)
   */
  async createStoryWithSwipeUp(
    mediaUrl: string,
    swipeUpUrl: string
  ): Promise<string> {
    logger.info('Creating story with swipe-up link', { url: swipeUpUrl });

    const mediaId = await this.uploadStoryMedia(mediaUrl);

    const url = `${this.baseUrl}/${mediaId}`;

    await axios.post(
      url,
      {
        story_link: swipeUpUrl,
      },
      {
        params: {
          access_token: this.accessToken,
        },
      }
    );

    return this.publishStory(mediaId);
  }

  /**
   * Create story with multiple product stickers
   */
  async createStoryWithMultipleProducts(
    mediaUrl: string,
    stickers: StoryProductSticker[]
  ): Promise<string> {
    logger.info('Creating story with multiple products', {
      count: stickers.length,
    });

    const mediaId = await this.uploadStoryMedia(mediaUrl);

    // Add each sticker
    for (const sticker of stickers) {
      await this.addProductSticker(mediaId, sticker);
    }

    return this.publishStory(mediaId);
  }

  /**
   * Get story insights
   */
  async getStoryInsights(storyId: string): Promise<any> {
    const url = `${this.baseUrl}/${storyId}/insights`;

    const response = await axios.get(url, {
      params: {
        metric: 'impressions,reach,exits,replies,taps_forward,taps_back,product_button_clicks',
        access_token: this.accessToken,
      },
    });

    return response.data;
  }

  /**
   * Create story highlight with shopping
   */
  async createShoppingHighlight(
    name: string,
    coverImageUrl: string,
    storyIds: string[]
  ): Promise<string> {
    logger.info('Creating shopping highlight', { name });

    const url = `${this.baseUrl}/${this.businessAccountId}/story_highlights`;

    const response = await axios.post(
      url,
      {
        name,
        cover_url: coverImageUrl,
        story_ids: storyIds,
      },
      {
        params: {
          access_token: this.accessToken,
        },
      }
    );

    return response.data.id;
  }

  /**
   * Schedule story with product
   */
  async scheduleProductStory(
    mediaUrl: string,
    sticker: StoryProductSticker,
    publishTime: Date
  ): Promise<string> {
    logger.info('Scheduling product story', { publish_time: publishTime });

    const mediaId = await this.uploadStoryMedia(mediaUrl);
    await this.addProductSticker(mediaId, sticker);

    const url = `${this.baseUrl}/${this.businessAccountId}/media_publish`;

    const response = await axios.post(
      url,
      {
        creation_id: mediaId,
        published: false,
        scheduled_publish_time: Math.floor(publishTime.getTime() / 1000),
      },
      {
        params: {
          access_token: this.accessToken,
        },
      }
    );

    return response.data.id;
  }

  /**
   * Get product sticker analytics
   */
  async getProductStickerAnalytics(
    storyId: string,
    productId: string
  ): Promise<any> {
    const insights = await this.getStoryInsights(storyId);

    return {
      story_id: storyId,
      product_id: productId,
      impressions: insights.data.find((i: any) => i.name === 'impressions')?.values[0]?.value || 0,
      product_clicks: insights.data.find((i: any) => i.name === 'product_button_clicks')?.values[0]?.value || 0,
      reach: insights.data.find((i: any) => i.name === 'reach')?.values[0]?.value || 0,
    };
  }
}

export default InstagramStoryLinks;
