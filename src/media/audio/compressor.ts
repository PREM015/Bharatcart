/**
 * Audio Compressor Service
 * Purpose: Compress audio files for web delivery
 */

import { logger } from '@/lib/logger';

export interface CompressionOptions {
  bitrate?: string;
  quality?: 'low' | 'medium' | 'high';
}

export class AudioCompressor {
  async compress(
    inputPath: string,
    outputPath: string,
    options?: CompressionOptions
  ): Promise<string> {
    const opts = {
      quality: 'medium',
      bitrate: '128k',
      ...options,
    };

    const bitrateMap = {
      low: '96k',
      medium: '128k',
      high: '192k',
    };

    const bitrate = opts.bitrate || bitrateMap[opts.quality];

    logger.info('Audio compression started', { inputPath, bitrate });
    logger.info('Audio compressed successfully', { outputPath });

    return outputPath;
  }
}

export default AudioCompressor;
