/**
 * Image Filters Service
 * Purpose: Apply artistic filters and effects to images
 */

import sharp from 'sharp';
import { logger } from '@/lib/logger';

export type FilterType = 'grayscale' | 'sepia' | 'blur' | 'sharpen' | 'brighten' | 'darken' | 'saturate';

export class ImageFilters {
  async applyFilter(input: Buffer, filter: FilterType, intensity: number = 1): Promise<Buffer> {
    try {
      let pipeline = sharp(input);

      switch (filter) {
        case 'grayscale':
          pipeline = pipeline.grayscale();
          break;

        case 'blur':
          pipeline = pipeline.blur(Math.max(0.3, intensity * 10));
          break;

        case 'sharpen':
          pipeline = pipeline.sharpen(Math.max(1, intensity * 3));
          break;

        case 'brighten':
          pipeline = pipeline.modulate({ brightness: 1 + intensity * 0.5 });
          break;

        case 'darken':
          pipeline = pipeline.modulate({ brightness: 1 - intensity * 0.5 });
          break;

        case 'saturate':
          pipeline = pipeline.modulate({ saturation: 1 + intensity });
          break;
      }

      return pipeline.toBuffer();
    } catch (error) {
      logger.error('Filter application failed', { error, filter });
      throw new Error(`Failed to apply ${filter} filter`);
    }
  }

  async applyMultipleFilters(
    input: Buffer,
    filters: Array<{ type: FilterType; intensity?: number }>
  ): Promise<Buffer> {
    let result = input;

    for (const filter of filters) {
      result = await this.applyFilter(result, filter.type, filter.intensity);
    }

    return result;
  }
}

export default ImageFilters;
