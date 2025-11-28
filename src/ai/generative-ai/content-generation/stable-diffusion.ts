/**
 * Stable Diffusion Integration
 * Purpose: Generate images using Stable Diffusion XL
 * Features:
 * - Open source model
 * - Local or API-based generation
 * - Fine-tuned models support
 * - LoRA support
 * - ControlNet integration
 */

import axios from 'axios';
import { logger } from '@/lib/logger';
import FormData from 'form-data';

export interface StableDiffusionRequest {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  cfgScale?: number; // Guidance scale
  sampler?: string;
  seed?: number;
  batchSize?: number;
  model?: string;
  lora?: Array<{ name: string; weight: number }>;
}

export interface StableDiffusionResult {
  images: string[]; // Base64 encoded images
  info: {
    prompt: string;
    seed: number;
    steps: number;
    cfgScale: number;
  };
}

export class StableDiffusionGenerator {
  private apiUrl: string;

  constructor() {
    // Can point to local A1111 API or cloud service like Replicate
    this.apiUrl = process.env.STABLE_DIFFUSION_API_URL || 'http://localhost:7860';
  }

  /**
   * Generate image with Stable Diffusion
   */
  async generate(request: StableDiffusionRequest): Promise<StableDiffusionResult> {
    logger.info('Generating image with Stable Diffusion', { prompt: request.prompt });

    try {
      const payload = {
        prompt: request.prompt,
        negative_prompt: request.negativePrompt || this.getDefaultNegativePrompt(),
        width: request.width || 1024,
        height: request.height || 1024,
        steps: request.steps || 30,
        cfg_scale: request.cfgScale || 7,
        sampler_name: request.sampler || 'DPM++ 2M Karras',
        seed: request.seed || -1,
        batch_size: request.batchSize || 1,
      };

      // Switch model if specified
      if (request.model) {
        await this.switchModel(request.model);
      }

      // Apply LoRA if specified
      if (request.lora && request.lora.length > 0) {
        payload.prompt = this.applyLoRA(payload.prompt, request.lora);
      }

      const response = await axios.post(
        `${this.apiUrl}/sdapi/v1/txt2img`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        images: response.data.images,
        info: {
          prompt: request.prompt,
          seed: response.data.info?.seed || request.seed || -1,
          steps: request.steps || 30,
          cfgScale: request.cfgScale || 7,
        },
      };
    } catch (error) {
      logger.error('Stable Diffusion generation failed', { error });
      throw error;
    }
  }

  /**
   * Image-to-image generation
   */
  async img2img(
    inputImage: string, // Base64
    request: Omit<StableDiffusionRequest, 'width' | 'height'>
  ): Promise<StableDiffusionResult> {
    logger.info('Running img2img with Stable Diffusion');

    const payload = {
      init_images: [inputImage],
      prompt: request.prompt,
      negative_prompt: request.negativePrompt || this.getDefaultNegativePrompt(),
      steps: request.steps || 30,
      cfg_scale: request.cfgScale || 7,
      denoising_strength: 0.7,
      sampler_name: request.sampler || 'DPM++ 2M Karras',
      seed: request.seed || -1,
    };

    const response = await axios.post(
      `${this.apiUrl}/sdapi/v1/img2img`,
      payload
    );

    return {
      images: response.data.images,
      info: {
        prompt: request.prompt,
        seed: response.data.info?.seed || request.seed || -1,
        steps: request.steps || 30,
        cfgScale: request.cfgScale || 7,
      },
    };
  }

  /**
   * Inpainting (edit specific areas)
   */
  async inpaint(
    inputImage: string,
    maskImage: string,
    prompt: string
  ): Promise<StableDiffusionResult> {
    logger.info('Running inpainting');

    const payload = {
      init_images: [inputImage],
      mask: maskImage,
      prompt,
      negative_prompt: this.getDefaultNegativePrompt(),
      steps: 30,
      cfg_scale: 7,
      denoising_strength: 0.75,
      inpainting_fill: 1, // Original
      inpaint_full_res: true,
    };

    const response = await axios.post(
      `${this.apiUrl}/sdapi/v1/img2img`,
      payload
    );

    return {
      images: response.data.images,
      info: {
        prompt,
        seed: -1,
        steps: 30,
        cfgScale: 7,
      },
    };
  }

  /**
   * Generate with ControlNet
   */
  async generateWithControlNet(
    request: StableDiffusionRequest,
    controlNetConfig: {
      image: string;
      module: 'canny' | 'depth' | 'openpose' | 'mlsd';
      model: string;
      weight?: number;
    }
  ): Promise<StableDiffusionResult> {
    logger.info('Generating with ControlNet', { module: controlNetConfig.module });

    const payload = {
      prompt: request.prompt,
      negative_prompt: request.negativePrompt || this.getDefaultNegativePrompt(),
      width: request.width || 1024,
      height: request.height || 1024,
      steps: request.steps || 30,
      cfg_scale: request.cfgScale || 7,
      alwayson_scripts: {
        controlnet: {
          args: [
            {
              input_image: controlNetConfig.image,
              module: controlNetConfig.module,
              model: controlNetConfig.model,
              weight: controlNetConfig.weight || 1.0,
            },
          ],
        },
      },
    };

    const response = await axios.post(
      `${this.apiUrl}/sdapi/v1/txt2img`,
      payload
    );

    return {
      images: response.data.images,
      info: {
        prompt: request.prompt,
        seed: -1,
        steps: request.steps || 30,
        cfgScale: request.cfgScale || 7,
      },
    };
  }

  /**
   * Switch model
   */
  private async switchModel(modelName: string): Promise<void> {
    await axios.post(`${this.apiUrl}/sdapi/v1/options`, {
      sd_model_checkpoint: modelName,
    });
  }

  /**
   * Apply LoRA to prompt
   */
  private applyLoRA(prompt: string, loras: Array<{ name: string; weight: number }>): string {
    let enhancedPrompt = prompt;

    loras.forEach((lora) => {
      enhancedPrompt += ` <lora:${lora.name}:${lora.weight}>`;
    });

    return enhancedPrompt;
  }

  /**
   * Get default negative prompt
   */
  private getDefaultNegativePrompt(): string {
    return 'low quality, blurry, distorted, deformed, bad anatomy, watermark, text, logo, signature';
  }

  /**
   * Generate product image with optimal settings
   */
  async generateProductImage(
    productName: string,
    background: 'white' | 'studio' | 'lifestyle' = 'white'
  ): Promise<StableDiffusionResult> {
    const backgroundPrompts = {
      white: 'pure white background, studio lighting',
      studio: 'professional studio setup, gradient background',
      lifestyle: 'lifestyle setting, natural environment',
    };

    const request: StableDiffusionRequest = {
      prompt: `professional product photography of ${productName}, ${backgroundPrompts[background]}, high quality, 8k, sharp focus, detailed`,
      negativePrompt: 'low quality, blurry, distorted, text, watermark, logo',
      width: 1024,
      height: 1024,
      steps: 40,
      cfgScale: 7,
      sampler: 'DPM++ 2M Karras',
    };

    return this.generate(request);
  }

  /**
   * Upscale image
   */
  async upscale(imageBase64: string, upscaler: string = 'R-ESRGAN 4x+'): Promise<string> {
    logger.info('Upscaling image', { upscaler });

    const response = await axios.post(`${this.apiUrl}/sdapi/v1/extra-single-image`, {
      image: imageBase64,
      upscaler_1: upscaler,
      upscaling_resize: 2,
    });

    return response.data.image;
  }
}

export default StableDiffusionGenerator;
