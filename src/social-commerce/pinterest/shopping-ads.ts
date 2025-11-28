/**
 * Pinterest Shopping Ads
 * Purpose: Create and manage Pinterest shopping ad campaigns
 * Description: Ad creation, catalog promotion, conversion tracking
 */

import { logger } from '@/lib/logger';
import axios from 'axios';

export interface ShoppingAdCampaign {
  name: string;
  status: 'ACTIVE' | 'PAUSED';
  daily_budget: number;
  lifetime_budget?: number;
  start_time: Date;
  end_time?: Date;
  objective: 'AWARENESS' | 'CONSIDERATION' | 'CATALOGS' | 'WEB_CONVERSIONS';
}

export class PinterestShoppingAds {
  private accessToken: string;
  private adAccountId: string;
  private baseUrl = 'https://api.pinterest.com/v5';

  constructor(accessToken: string, adAccountId: string) {
    this.accessToken = accessToken;
    this.adAccountId = adAccountId;
  }

  /**
   * Create shopping ad campaign
   */
  async createCampaign(campaign: ShoppingAdCampaign): Promise<string> {
    logger.info('Creating Pinterest shopping ad campaign', { name: campaign.name });

    const url = `${this.baseUrl}/ad_accounts/${this.adAccountId}/campaigns`;

    try {
      const response = await axios.post(
        url,
        {
          name: campaign.name,
          status: campaign.status,
          daily_spend_cap: campaign.daily_budget * 100, // Convert to microcurrency
          lifetime_spend_cap: campaign.lifetime_budget ? campaign.lifetime_budget * 100 : undefined,
          start_time: Math.floor(campaign.start_time.getTime() / 1000),
          end_time: campaign.end_time ? Math.floor(campaign.end_time.getTime() / 1000) : undefined,
          objective_type: campaign.objective,
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      const campaignId = response.data.id;
      logger.info('Campaign created', { campaign_id: campaignId });

      return campaignId;
    } catch (error: any) {
      logger.error('Failed to create campaign', {
        error: error.response?.data || error.message,
      });
      throw error;
    }
  }

  /**
   * Get campaign performance
   */
  async getCampaignAnalytics(campaignId: string, dateRange: {
    start_date: string;
    end_date: string;
  }): Promise<any> {
    const url = `${this.baseUrl}/ad_accounts/${this.adAccountId}/analytics`;

    const response = await axios.get(url, {
      params: {
        campaign_ids: campaignId,
        start_date: dateRange.start_date,
        end_date: dateRange.end_date,
        columns: 'SPEND_IN_DOLLAR,IMPRESSION,CLICKTHROUGH,TOTAL_CLICKTHROUGH,TOTAL_ENGAGEMENT,OUTBOUND_CLICK,PIN_CLICK,SAVE,TOTAL_CONVERSIONS',
        granularity: 'DAY',
      },
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    return response.data;
  }
}

export default PinterestShoppingAds;
