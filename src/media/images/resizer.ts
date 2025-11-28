/**
 * Image Resizer Service
 * Purpose: Resize images to multiple dimensions
 * Description: Smart cropping, aspect ratio preservation, thumbnail generation
 */

import sharp from 'sharp';
import { logger } from '@/lib/logger';

export interface ResizeOptions {
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  withoutEnlargement?: boolean;
}

export class ImageResizer {
  async resize(input: Buffer, options: ResizeOptions): Promise<Buffer> {
    try {
      return await sharp(input)
        .resize({
          width: options.width,
          height: options.height,
          fit: options.fit || 'cover',
          position: options.position || 'center',
          withoutEnlargement: options.withoutEnlargement ?? true,
        })
        .toBuffer();
    } catch (error) {
      logger.error('Image resize failed', { error, options });
      throw new Error('Failed to resize image');
    }
  }

  async createThumbnail(input: Buffer, size: number = 150): Promise<Buffer> {
    return this.resize(input, {
      width: size,
      height: size,
      fit: 'cover',
    });
  }

  async createResponsiveSet(
    input: Buffer,
    sizes: number[] = [320, 640, 1024, 1920]
  ): Promise<Map<number, Buffer>> {
    const results = new Map<number, Buffer>();

    for (const size of sizes) {
      const resized = await this.resize(input, { width: size });
      results.set(size, resized);
    }

    return results;
  }

  async smartCrop(
    input: Buffer,
    width: number,
    height: number
  ): Promise<Buffer> {
    const metadata = await sharp(input).metadata();
    
    if (!metadata.width || !metadata.height) {
      throw new Error('Unable to get image dimensions');
    }

    const inputRatio = metadata.width / metadata.height;
    const outputRatio = width / height;

    let resizeWidth: number;
    let resizeHeight: number;

    if (inputRatio > outputRatio) {
      resizeHeight = height;
      resizeWidth = Math.round(height * inputRatio);
    } else {
      resizeWidth = width;
      resizeHeight = Math.round(width / inputRatio);
    }

    return sharp(input)
      .resize(resizeWidth, resizeHeight, { fit: 'cover' })
      .extract({
        left: Math.round((resizeWidth - width) / 2),
        top: Math.round((resizeHeight - height) / 2),
        width,
        height,
      })
      .toBuffer();
  }
}

export default ImageResizer;
