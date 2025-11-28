/**
 * Image Metadata Extractor
 * Purpose: Extract EXIF, IPTC metadata from images
 */

import sharp from 'sharp';
import { logger } from '@/lib/logger';

export interface ImageMetadata {
  width?: number;
  height?: number;
  format?: string;
  size: number;
  hasAlpha?: boolean;
  orientation?: number;
  colorSpace?: string;
  exif?: any;
}

export class MetadataExtractor {
  async extract(input: Buffer): Promise<ImageMetadata> {
    try {
      const metadata = await sharp(input).metadata();

      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: input.length,
        hasAlpha: metadata.hasAlpha,
        orientation: metadata.orientation,
        colorSpace: metadata.space,
        exif: metadata.exif,
      };
    } catch (error) {
      logger.error('Metadata extraction failed', { error });
      throw new Error('Failed to extract metadata');
    }
  }

  async stripMetadata(input: Buffer): Promise<Buffer> {
    return sharp(input)
      .withMetadata({
        exif: {},
        icc: undefined,
      })
      .toBuffer();
  }
}

export default MetadataExtractor;
