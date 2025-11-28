/**
 * Image Watermarking Service
 * Purpose: Add watermarks to images for copyright protection
 */

import sharp from 'sharp';
import { logger } from '@/lib/logger';

export interface WatermarkOptions {
  position?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  opacity?: number;
  scale?: number;
}

export class ImageWatermark {
  async addWatermark(
    image: Buffer,
    watermark: Buffer,
    options?: WatermarkOptions
  ): Promise<Buffer> {
    const opts = {
      position: 'bottom-right' as const,
      opacity: 0.5,
      scale: 0.2,
      ...options,
    };

    try {
      const imageMetadata = await sharp(image).metadata();
      const watermarkMetadata = await sharp(watermark).metadata();

      if (!imageMetadata.width || !imageMetadata.height) {
        throw new Error('Invalid image dimensions');
      }

      const watermarkWidth = Math.round(imageMetadata.width * opts.scale);
      const resizedWatermark = await sharp(watermark)
        .resize(watermarkWidth)
        .toBuffer();

      const watermarkResizedMeta = await sharp(resizedWatermark).metadata();

      let left = 0;
      let top = 0;

      switch (opts.position) {
        case 'center':
          left = Math.round((imageMetadata.width - (watermarkResizedMeta.width || 0)) / 2);
          top = Math.round((imageMetadata.height - (watermarkResizedMeta.height || 0)) / 2);
          break;
        case 'top-left':
          left = 10;
          top = 10;
          break;
        case 'top-right':
          left = imageMetadata.width - (watermarkResizedMeta.width || 0) - 10;
          top = 10;
          break;
        case 'bottom-left':
          left = 10;
          top = imageMetadata.height - (watermarkResizedMeta.height || 0) - 10;
          break;
        case 'bottom-right':
          left = imageMetadata.width - (watermarkResizedMeta.width || 0) - 10;
          top = imageMetadata.height - (watermarkResizedMeta.height || 0) - 10;
          break;
      }

      return sharp(image)
        .composite([
          {
            input: resizedWatermark,
            left,
            top,
            blend: 'over',
          },
        ])
        .toBuffer();
    } catch (error) {
      logger.error('Watermark application failed', { error });
      throw new Error('Failed to add watermark');
    }
  }

  async addTextWatermark(
    image: Buffer,
    text: string,
    options?: { fontSize?: number; color?: string }
  ): Promise<Buffer> {
    const opts = {
      fontSize: 24,
      color: 'white',
      ...options,
    };

    const svg = `
      <svg width="500" height="100">
        <text x="10" y="50" font-size="${opts.fontSize}" fill="${opts.color}" opacity="0.5">
          ${text}
        </text>
      </svg>
    `;

    const textBuffer = Buffer.from(svg);
    return this.addWatermark(image, textBuffer);
  }
}

export default ImageWatermark;
