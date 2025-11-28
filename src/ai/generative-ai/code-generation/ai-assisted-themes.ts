/**
 * AI-Assisted Theme Generator
 * Purpose: Generate custom themes using AI
 * Features:
 * - Color palette generation
 * - Typography recommendations
 * - CSS generation
 * - Component styling
 */

import OpenAI from 'openai';
import { logger } from '@/lib/logger';

export interface ThemeRequest {
  brandName: string;
  industry: string;
  mood?: string;
  primaryColor?: string;
  preferences?: string[];
}

export interface GeneratedTheme {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    success: string;
    warning: string;
    error: string;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
    fontSizes: Record<string, string>;
  };
  spacing: Record<string, string>;
  borderRadius: Record<string, string>;
  shadows: Record<string, string>;
  css: string;
  tailwindConfig: string;
}

export class AIAssistedThemeGenerator {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Generate complete theme
   */
  async generateTheme(request: ThemeRequest): Promise<GeneratedTheme> {
    logger.info('Generating AI theme', { brand: request.brandName });

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are an expert UI/UX designer and theme creator. Generate a complete design system as JSON.`,
        },
        {
          role: 'user',
          content: `Create a theme for:
Brand: ${request.brandName}
Industry: ${request.industry}
${request.mood ? `Mood: ${request.mood}` : ''}
${request.primaryColor ? `Primary Color: ${request.primaryColor}` : ''}

Include: colors (hex codes), typography (Google Fonts), spacing scale, border radius, shadows, and generate CSS variables and Tailwind config.`,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const theme = JSON.parse(completion.choices[0].message.content || '{}');

    // Generate CSS
    const css = this.generateCSS(theme);
    const tailwindConfig = this.generateTailwindConfig(theme);

    return {
      ...theme,
      css,
      tailwindConfig,
    };
  }

  /**
   * Generate CSS variables
   */
  private generateCSS(theme: any): string {
    return `:root {
  /* Colors */
  --color-primary: ${theme.colors.primary};
  --color-secondary: ${theme.colors.secondary};
  --color-accent: ${theme.colors.accent};
  --color-background: ${theme.colors.background};
  --color-text: ${theme.colors.text};
  
  /* Typography */
  --font-heading: ${theme.typography.headingFont};
  --font-body: ${theme.typography.bodyFont};
  
  /* Spacing */
  --spacing-sm: ${theme.spacing.sm};
  --spacing-md: ${theme.spacing.md};
  --spacing-lg: ${theme.spacing.lg};
}`;
  }

  /**
   * Generate Tailwind config
   */
  private generateTailwindConfig(theme: any): string {
    return `module.exports = {
  theme: {
    extend: {
      colors: ${JSON.stringify(theme.colors, null, 2)},
      fontFamily: {
        heading: ['${theme.typography.headingFont}'],
        body: ['${theme.typography.bodyFont}'],
      },
    },
  },
}`;
  }
}

export default AIAssistedThemeGenerator;
