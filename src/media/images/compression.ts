/**
 * Image Compression Service
 * Purpose: Compress images for web optimization
 * Description: Multiple format support, quality controls, progressive encoding
 * 
 * Features:
 * - JPEG, PNG, WebP compression
 * - Quality presets
 * - Progressive JPEG
 * - Lossless/lossy modes
 * - Batch processing
 * - Compression metrics
 * 
 * @example
 * ```typescript
 * const compressor = new ImageCompressor();
 * const result = await compressor.compress(buffer, {
 *   format: 'webp',
 *   quality: 85
 * });
 * ```
 */

import sharp from 'sharp';
import { logger } from '@/lib/logger';

export interface CompressionOptions {
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
  quality?: number;
  progressive?: boolean;
  lossless?: boolean;
  effort?: number;
}

export interface CompressionResult {
  buffer: Buffer;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  format: string;
}

export class ImageCompressor {
  private defaultOptions: CompressionOptions = {
    format: 'webp',
    quality: 85,
    progressive: true,
    lossless: false,
    effort: 4,
  };

  /**
   * Compress image buffer
   */
  async compress(
    input: Buffer,
    options?: CompressionOptions
  ): Promise<CompressionResult> {
    const opts = { ...this.defaultOptions, ...options };
    const originalSize = input.length;

    try {
      let pipeline = sharp(input);

      switch (opts.format) {
        case 'jpeg':
          pipeline = pipeline.jpeg({
            quality: opts.quality,
            progressive: opts.progressive,
            mozjpeg: true,
          });
          break;

        case 'png':
          pipeline = pipeline.png({
            quality: opts.quality,
            progressive: opts.progressive,
            compressionLevel: 9,
          });
          break;

        case 'webp':
          pipeline = pipeline.webp({
            quality: opts.quality,
            lossless: opts.lossless,
            effort: opts.effort,
          });
          break;

        case 'avif':
          pipeline = pipeline.avif({
            quality: opts.quality,
            lossless: opts.lossless,
            effort: opts.effort,
          });
          break;
      }

      const buffer = await pipeline.toBuffer();
      const compressedSize = buffer.length;
      const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;

      logger.info('Image compressed', {
        originalSize,
        compressedSize,
        compressionRatio: `${compressionRatio.toFixed(2)}%`,
        format: opts.format,
      });

      return {
        buffer,
        originalSize,
        compressedSize,
        compressionRatio,
        format: opts.format || 'webp',
      };
    } catch (error) {
      logger.error('Image compression failed', { error });
      throw new Error('Failed to compress image');
    }
  }

  /**
   * Compress with quality presets
   */
  async compressWithPreset(
    input: Buffer,
    preset: 'high' | 'medium' | 'low'
  ): Promise<CompressionResult> {
    const presets = {
      high: { format: 'webp' as const, quality: 90, effort: 6 },
      medium: { format: 'webp' as const, quality: 80, effort: 4 },
      low: { format: 'jpeg' as const, quality: 70, effort: 2 },
    };

    return this.compress(input, presets[preset]);
  }

  /**
   * Batch compress multiple images
   */
  async compressBatch(
    inputs: Buffer[],
    options?: CompressionOptions
  ): Promise<CompressionResult[]> {
    return Promise.all(inputs.map(input => this.compress(input, options)));
  }

  /**
   * Get optimal format for image
   */
  async getOptimalFormat(input: Buffer): Promise<'jpeg' | 'png' | 'webp'> {
    const metadata = await sharp(input).metadata();
    
    if (metadata.hasAlpha) {
      return 'webp';
    }
    
    if (metadata.format === 'png' && metadata.width && metadata.width < 500) {
      return 'png';
    }

    return 'jpeg';
  }
}

export default ImageCompressor;
