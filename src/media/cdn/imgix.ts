/**
 * Imgix CDN Integration
 * Purpose: Real-time image transformations via Imgix
 */

import ImgixClient from '@imgix/js-core';
import { logger } from '@/lib/logger';

export interface ImgixOptions {
  width?: number;
  height?: number;
  fit?: string;
  format?: string;
  quality?: number;
}

export class ImgixManager {
  private client: ImgixClient;

  constructor(domain: string, secureToken?: string) {
    this.client = new ImgixClient({
      domain,
      secureURLToken: secureToken,
    });
  }

  buildUrl(path: string, options?: ImgixOptions): string {
    const params: any = {};

    if (options?.width) params.w = options.width;
    if (options?.height) params.h = options.height;
    if (options?.fit) params.fit = options.fit;
    if (options?.format) params.fm = options.format;
    if (options?.quality) params.q = options.quality;

    return this.client.buildURL(path, params);
  }

  buildResponsiveUrls(path: string, widths: number[]): string[] {
    return widths.map(width => this.buildUrl(path, { width }));
  }

  buildSrcSet(path: string, widths: number[]): string {
    return widths
      .map(width => `${this.buildUrl(path, { width })} ${width}w`)
      .join(', ');
  }
}

export default ImgixManager;
