/**
 * Azure Blob Storage Manager
 * Purpose: Upload, download, delete media from Azure Blob
 */

import { BlobServiceClient } from '@azure/storage-blob';
import { logger } from '@/lib/logger';

export class AzureBlobManager {
  private client: BlobServiceClient;
  private containerName: string;

  constructor(connectionString: string, containerName: string) {
    this.client = BlobServiceClient.fromConnectionString(connectionString);
    this.containerName = containerName;
  }

  async upload(key: string, body: Buffer, contentType?: string): Promise<string> {
    logger.info('Uploading to Azure Blob', { key, size: body.length });

    const containerClient = this.client.getContainerClient(this.containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(key);

    await blockBlobClient.upload(body, body.length, {
      blobHTTPHeaders: { blobContentType: contentType },
    });

    return blockBlobClient.url;
  }

  async download(key: string): Promise<Buffer> {
    logger.info('Downloading from Azure Blob', { key });

    const containerClient = this.client.getContainerClient(this.containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(key);

    const downloadResponse = await blockBlobClient.download();
    const chunks: Buffer[] = [];

    if (downloadResponse.readableStreamBody) {
      for await (const chunk of downloadResponse.readableStreamBody) {
        chunks.push(Buffer.from(chunk));
      }
    }

    return Buffer.concat(chunks);
  }

  async delete(key: string): Promise<void> {
    logger.info('Deleting from Azure Blob', { key });

    const containerClient = this.client.getContainerClient(this.containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(key);

    await blockBlobClient.delete();
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const containerClient = this.client.getContainerClient(this.containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(key);

    return blockBlobClient.url;
  }
}

export default AzureBlobManager;
