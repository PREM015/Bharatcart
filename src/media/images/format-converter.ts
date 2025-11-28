/**
 * Image Format Converter
 * Purpose: Convert between image formats
 */

import sharp from 'sharp';
import { logger } from '@/lib/logger';

export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'avif' | 'gif' | 'tiff';

export class FormatConverter {
  async convert(input: Buffer, targetFormat: ImageFormat): Promise<Buffer> {
    try {
      const converter = sharp(input);

      switch (targetFormat) {
        case 'jpeg':
          return converter.jpeg({ quality: 90 }).toBuffer();
        case 'png':
          return converter.png({ compressionLevel: 9 }).toBuffer();
        case 'webp':
          return converter.webp({ quality: 90 }).toBuffer();
        case 'avif':
          return converter.avif({ quality: 90 }).toBuffer();
        case 'gif':
          return converter.gif().toBuffer();
        case 'tiff':
          return converter.tiff().toBuffer();
        default:
          throw new Error(`Unsupported format: ${targetFormat}`);
      }
    } catch (error) {
      logger.error('Format conversion failed', { error, targetFormat });
      throw new Error(`Failed to convert to ${targetFormat}`);
    }
  }

  async convertToModern(input: Buffer): Promise<{ webp: Buffer; avif: Buffer }> {
    const [webp, avif] = await Promise.all([
      this.convert(input, 'webp'),
      this.convert(input, 'avif'),
    ]);

    return { webp, avif };
  }
}

export default FormatConverter;
