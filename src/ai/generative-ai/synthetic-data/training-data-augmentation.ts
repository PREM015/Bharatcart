/**
 * Training Data Augmentation
 * Purpose: Augment training data for ML models
 * Features:
 * - Text augmentation (paraphrasing)
 * - Image augmentation
 * - Data balancing
 * - Synthetic examples
 */

import OpenAI from 'openai';
import { logger } from '@/lib/logger';

export class TrainingDataAugmentation {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Augment text data (paraphrasing)
   */
  async augmentText(text: string, variations: number = 3): Promise<string[]> {
    logger.info('Augmenting text data', { variations });

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `Generate ${variations} paraphrased versions of the following text. Keep the meaning the same but vary the wording.`,
        },
        { role: 'user', content: text },
      ],
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');
    return result.variations || [];
  }

  /**
   * Generate synthetic training examples
   */
  async generateSyntheticExamples(
    category: string,
    count: number
  ): Promise<Array<{ text: string; label: string }>> {
    logger.info('Generating synthetic examples', { category, count });

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'user',
          content: `Generate ${count} diverse training examples for category: ${category}. 
Return as JSON array with objects containing 'text' and 'label' fields.`,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');
    return result.examples || [];
  }

  /**
   * Balance dataset
   */
  async balanceDataset(
    data: Array<{ text: string; label: string }>
  ): Promise<Array<{ text: string; label: string }>> {
    logger.info('Balancing dataset');

    // Count labels
    const labelCounts: Record<string, number> = {};
    data.forEach((item) => {
      labelCounts[item.label] = (labelCounts[item.label] || 0) + 1;
    });

    // Find max count
    const maxCount = Math.max(...Object.values(labelCounts));

    // Augment underrepresented classes
    const balanced = [...data];

    for (const label of Object.keys(labelCounts)) {
      const deficit = maxCount - labelCounts[label];

      if (deficit > 0) {
        const examples = data.filter((item) => item.label === label);

        for (let i = 0; i < deficit; i++) {
          const original = examples[i % examples.length];
          const augmented = await this.augmentText(original.text, 1);

          balanced.push({
            text: augmented[0],
            label: original.label,
          });
        }
      }
    }

    return balanced;
  }
}

export default TrainingDataAugmentation;
