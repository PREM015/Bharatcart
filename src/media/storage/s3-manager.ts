/**
 * AWS S3 Storage Manager
 * Purpose: Upload, download, delete media from S3
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger } from '@/lib/logger';

export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  cacheControl?: string;
}

export class S3Manager {
  private client: S3Client;
  private bucket: string;

  constructor(bucket: string) {
    this.client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
    });
    this.bucket = bucket;
  }

  async upload(
    key: string,
    body: Buffer,
    options?: UploadOptions
  ): Promise<string> {
    logger.info('Uploading to S3', { key, size: body.length });

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: options?.contentType,
        Metadata: options?.metadata,
        CacheControl: options?.cacheControl || 'public, max-age=31536000',
      })
    );

    return `https://${this.bucket}.s3.amazonaws.com/${key}`;
  }

  async download(key: string): Promise<Buffer> {
    logger.info('Downloading from S3', { key });

    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    );

    const chunks: Uint8Array[] = [];
    const stream = response.Body as any;

    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  }

  async delete(key: string): Promise<void> {
    logger.info('Deleting from S3', { key });

    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    );
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }

  async uploadMultiple(
    files: Array<{ key: string; body: Buffer; options?: UploadOptions }>
  ): Promise<string[]> {
    return Promise.all(
      files.map(file => this.upload(file.key, file.body, file.options))
    );
  }
}

export default S3Manager;
