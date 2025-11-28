/**
 * AWS CloudFront CDN Integration
 * Purpose: Distribute media through CloudFront
 */

import { CloudFront } from '@aws-sdk/client-cloudfront';
import { logger } from '@/lib/logger';

export class CloudFrontManager {
  private client: CloudFront;
  private distributionId: string;

  constructor(distributionId: string) {
    this.client = new CloudFront({
      region: process.env.AWS_REGION || 'us-east-1',
    });
    this.distributionId = distributionId;
  }

  async invalidateCache(paths: string[]): Promise<void> {
    logger.info('Invalidating CloudFront cache', { paths });

    await this.client.createInvalidation({
      DistributionId: this.distributionId,
      InvalidationBatch: {
        Paths: {
          Quantity: paths.length,
          Items: paths,
        },
        CallerReference: `${Date.now()}`,
      },
    });

    logger.info('Cache invalidation created');
  }

  getSignedUrl(objectKey: string, expiresIn: number = 3600): string {
    const domain = process.env.CLOUDFRONT_DOMAIN;
    return `https://${domain}/${objectKey}`;
  }
}

export default CloudFrontManager;
