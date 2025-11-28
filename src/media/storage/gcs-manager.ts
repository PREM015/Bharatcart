/**
 * Google Cloud Storage Manager
 * Purpose: Upload, download, delete media from GCS
 */

import { Storage } from '@google-cloud/storage';
import { logger } from '@/lib/logger';

export class GCSManager {
  private storage: Storage;
  private bucket: string;

  constructor(bucket: string) {
    this.storage = new Storage();
    this.bucket = bucket;
  }

  async upload(key: string, body: Buffer, contentType?: string): Promise<string> {
    logger.info('Uploading to GCS', { key, size: body.length });

    const file = this.storage.bucket(this.bucket).file(key);

    await file.save(body, {
      contentType,
      metadata: {
        cacheControl: 'public, max-age=31536000',
      },
    });

    return `https://storage.googleapis.com/${this.bucket}/${key}`;
  }

  async download(key: string): Promise<Buffer> {
    logger.info('Downloading from GCS', { key });

    const file = this.storage.bucket(this.bucket).file(key);
    const [buffer] = await file.download();

    return buffer;
  }

  async delete(key: string): Promise<void> {
    logger.info('Deleting from GCS', { key });

    await this.storage.bucket(this.bucket).file(key).delete();
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const file = this.storage.bucket(this.bucket).file(key);
    
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + expiresIn * 1000,
    });

    return url;
  }
}

export default GCSManager;
