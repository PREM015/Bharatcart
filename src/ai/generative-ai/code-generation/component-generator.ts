/**
 * AI Component Generator
 * Purpose: Generate React/Next.js components
 * Features:
 * - Component scaffolding
 * - TypeScript interfaces
 * - Styling (CSS/Tailwind)
 * - Tests generation
 */

import OpenAI from 'openai';
import { logger } from '@/lib/logger';

export interface ComponentRequest {
  name: string;
  description: string;
  props?: Record<string, string>;
  styling?: 'css' | 'tailwind' | 'styled-components';
  includeTests?: boolean;
}

export interface GeneratedComponent {
  component: string;
  types: string;
  styles?: string;
  tests?: string;
}

export class ComponentGenerator {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Generate React component
   */
  async generate(request: ComponentRequest): Promise<GeneratedComponent> {
    logger.info('Generating component', { name: request.name });

    const prompt = `Generate a Next.js 14 React component with TypeScript.

Component Name: ${request.name}
Description: ${request.description}
Props: ${JSON.stringify(request.props || {})}
Styling: ${request.styling || 'tailwind'}

Requirements:
- TypeScript with proper types
- Modern React hooks
- Responsive design
- Accessibility (ARIA labels)
- Clean, maintainable code

Return JSON with: component (TSX code), types (TypeScript interfaces), styles (CSS if needed)`;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    return JSON.parse(completion.choices[0].message.content || '{}');
  }
}

export default ComponentGenerator;
