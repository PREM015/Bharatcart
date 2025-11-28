/**
 * DALL-E Product Image Generator
 * Purpose: Generate product images using DALL-E 3
 * Features:
 * - Product visualization
 * - Lifestyle images
 * - Marketing materials
 * - Variations generation
 * - Style customization
 */

import OpenAI from 'openai';
import { logger } from '@/lib/logger';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

export interface ImageGenerationRequest {
  productName: string;
  description: string;
  style?: 'photorealistic' | 'artistic' | 'minimalist' | 'luxury' | 'cartoon';
  background?: 'white' | 'studio' | 'lifestyle' | 'nature' | 'urban';
  angle?: 'front' | 'side' | '3/4' | 'top' | 'lifestyle';
  lighting?: 'studio' | 'natural' | 'dramatic' | 'soft';
  quantity?: number;
  size?: '1024x1024' | '1792x1024' | '1024x1792';
}

export interface GeneratedImage {
  url: string;
  revisedPrompt: string;
  size: string;
  style: string;
  downloadUrl?: string;
}

export class DALLEProductImageGenerator {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Generate product image
   */
  async generate(request: ImageGenerationRequest): Promise<GeneratedImage[]> {
    logger.info('Generating product images with DALL-E', { product: request.productName });

    try {
      const prompt = this.buildPrompt(request);
      const quantity = request.quantity || 1;

      logger.info('DALL-E prompt', { prompt });

      const images: GeneratedImage[] = [];

      for (let i = 0; i < quantity; i++) {
        const response = await this.openai.images.generate({
          model: 'dall-e-3',
          prompt,
          n: 1,
          size: request.size || '1024x1024',
          quality: 'hd',
          style: request.style === 'artistic' ? 'vivid' : 'natural',
        });

        const image = response.data[0];

        images.push({
          url: image.url!,
          revisedPrompt: image.revised_prompt || prompt,
          size: request.size || '1024x1024',
          style: request.style || 'photorealistic',
        });
      }

      logger.info('Images generated successfully', { count: images.length });
      return images;
    } catch (error) {
      logger.error('DALL-E image generation failed', { error });
      throw error;
    }
  }

  /**
   * Build optimized prompt
   */
  private buildPrompt(request: ImageGenerationRequest): string {
    const parts: string[] = [];

    // Style prefix
    const stylePrefix = this.getStylePrefix(request.style || 'photorealistic');
    parts.push(stylePrefix);

    // Main subject
    parts.push(request.productName);

    // Description
    if (request.description) {
      parts.push(request.description);
    }

    // Background
    const background = this.getBackgroundDescription(request.background || 'white');
    parts.push(background);

    // Angle
    const angle = this.getAngleDescription(request.angle || 'front');
    parts.push(angle);

    // Lighting
    const lighting = this.getLightingDescription(request.lighting || 'studio');
    parts.push(lighting);

    // Quality enhancers
    parts.push('high quality, professional photography, 4K resolution');

    return parts.join(', ');
  }

  /**
   * Get style prefix
   */
  private getStylePrefix(style: string): string {
    const styleMap: Record<string, string> = {
      photorealistic: 'Professional product photography',
      artistic: 'Artistic product illustration',
      minimalist: 'Minimalist product design',
      luxury: 'Luxury premium product photography',
      cartoon: 'Stylized cartoon product illustration',
    };

    return styleMap[style] || styleMap.photorealistic;
  }

  /**
   * Get background description
   */
  private getBackgroundDescription(background: string): string {
    const backgroundMap: Record<string, string> = {
      white: 'on pure white background',
      studio: 'in professional studio setting with gradient backdrop',
      lifestyle: 'in realistic lifestyle environment',
      nature: 'in natural outdoor setting',
      urban: 'in modern urban environment',
    };

    return backgroundMap[background] || backgroundMap.white;
  }

  /**
   * Get angle description
   */
  private getAngleDescription(angle: string): string {
    const angleMap: Record<string, string> = {
      front: 'straight front view',
      side: 'side profile view',
      '3/4': 'three-quarter angle view',
      top: 'top-down view',
      lifestyle: 'lifestyle angle in use',
    };

    return angleMap[angle] || angleMap.front;
  }

  /**
   * Get lighting description
   */
  private getLightingDescription(lighting: string): string {
    const lightingMap: Record<string, string> = {
      studio: 'professional studio lighting',
      natural: 'soft natural lighting',
      dramatic: 'dramatic lighting with shadows',
      soft: 'soft diffused lighting',
    };

    return lightingMap[lighting] || lightingMap.studio;
  }

  /**
   * Generate product variations
   */
  async generateVariations(baseImage: string, count: number = 3): Promise<GeneratedImage[]> {
    logger.info('Generating image variations', { count });

    try {
      // Download base image
      const imageBuffer = await this.downloadImage(baseImage);

      // Save temporarily
      const tempPath = `/tmp/base-image-${Date.now()}.png`;
      fs.writeFileSync(tempPath, imageBuffer);

      const variations: GeneratedImage[] = [];

      const response = await this.openai.images.createVariation({
        model: 'dall-e-2', // Variations only work with DALL-E 2
        image: fs.createReadStream(tempPath) as any,
        n: Math.min(count, 10),
        size: '1024x1024',
      });

      for (const variation of response.data) {
        variations.push({
          url: variation.url!,
          revisedPrompt: 'Variation of original image',
          size: '1024x1024',
          style: 'variation',
        });
      }

      // Cleanup
      fs.unlinkSync(tempPath);

      return variations;
    } catch (error) {
      logger.error('Variation generation failed', { error });
      throw error;
    }
  }

  /**
   * Edit existing image
   */
  async editImage(
    imageUrl: string,
    maskUrl: string,
    prompt: string
  ): Promise<GeneratedImage> {
    logger.info('Editing image with DALL-E', { prompt });

    try {
      const imageBuffer = await this.downloadImage(imageUrl);
      const maskBuffer = await this.downloadImage(maskUrl);

      const imagePath = `/tmp/edit-image-${Date.now()}.png`;
      const maskPath = `/tmp/edit-mask-${Date.now()}.png`;

      fs.writeFileSync(imagePath, imageBuffer);
      fs.writeFileSync(maskPath, maskBuffer);

      const response = await this.openai.images.edit({
        model: 'dall-e-2',
        image: fs.createReadStream(imagePath) as any,
        mask: fs.createReadStream(maskPath) as any,
        prompt,
        n: 1,
        size: '1024x1024',
      });

      // Cleanup
      fs.unlinkSync(imagePath);
      fs.unlinkSync(maskPath);

      return {
        url: response.data[0].url!,
        revisedPrompt: prompt,
        size: '1024x1024',
        style: 'edited',
      };
    } catch (error) {
      logger.error('Image editing failed', { error });
      throw error;
    }
  }

  /**
   * Generate lifestyle images
   */
  async generateLifestyleImages(
    productName: string,
    scenarios: string[]
  ): Promise<GeneratedImage[]> {
    const images: GeneratedImage[] = [];

    for (const scenario of scenarios) {
      const request: ImageGenerationRequest = {
        productName,
        description: scenario,
        style: 'photorealistic',
        background: 'lifestyle',
        angle: 'lifestyle',
        lighting: 'natural',
      };

      const generated = await this.generate(request);
      images.push(...generated);
    }

    return images;
  }

  /**
   * Generate marketing materials
   */
  async generateMarketingMaterial(
    productName: string,
    materialType: 'banner' | 'social' | 'email'
  ): Promise<GeneratedImage> {
    const sizeMap = {
      banner: '1792x1024' as const,
      social: '1024x1024' as const,
      email: '1024x1792' as const,
    };

    const request: ImageGenerationRequest = {
      productName,
      description: `Eye-catching marketing ${materialType} with bold typography and compelling visuals`,
      style: 'artistic',
      background: 'studio',
      size: sizeMap[materialType],
    };

    const images = await this.generate(request);
    return images[0];
  }

  /**
   * Download image from URL
   */
  private async downloadImage(url: string): Promise<Buffer> {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
  }

  /**
   * Save image to storage
   */
  async saveToStorage(imageUrl: string, filename: string): Promise<string> {
    // In production, upload to S3, Cloudinary, etc.
    const buffer = await this.downloadImage(imageUrl);
    const savePath = `/uploads/generated/${filename}`;
    
    // Save locally for now
    fs.writeFileSync(`.${savePath}`, buffer);

    return savePath;
  }
}

export default DALLEProductImageGenerator;
