/**
 * Text Emotion Analysis
 * Purpose: Analyze emotions and sentiment from text
 * Technologies: GPT-4, Custom NLP models, BERT-based sentiment
 * Use Cases:
 * - Customer review sentiment
 * - Chat message emotion detection
 * - Support ticket prioritization
 * - Marketing message optimization
 */

import OpenAI from 'openai';
import { logger } from '@/lib/logger';

export interface TextEmotionResult {
  primaryEmotion: string;
  emotions: {
    joy: number;
    sadness: number;
    anger: number;
    fear: number;
    surprise: number;
    disgust: number;
    neutral: number;
  };
  sentiment: {
    polarity: number; // -1 to 1
    subjectivity: number; // 0 to 1
    label: 'positive' | 'neutral' | 'negative';
  };
  intensity: number; // 0 to 1
  toxicity: number; // 0 to 1
  sarcasm: number; // 0 to 1
  urgency: number; // 0 to 1
  keyPhrases: string[];
  intents: string[];
}

export class TextEmotionAnalyzer {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Analyze emotions in text
   */
  async analyze(text: string): Promise<TextEmotionResult> {
    logger.info('Analyzing text emotions', { textLength: text.length });

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an expert emotion analyst. Analyze the following text and return a JSON object with:
- primaryEmotion: the main emotion (joy, sadness, anger, fear, surprise, disgust, neutral)
- emotions: scores 0-1 for each emotion
- sentiment: polarity (-1 to 1), subjectivity (0-1), label (positive/neutral/negative)
- intensity: overall emotional intensity (0-1)
- toxicity: toxic content score (0-1)
- sarcasm: sarcasm detection score (0-1)
- urgency: urgency level (0-1)
- keyPhrases: important phrases (array of strings)
- intents: detected user intents (array of strings)`,
          },
          { role: 'user', content: text },
        ],
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(completion.choices[0].message.content || '{}');

      return {
        primaryEmotion: result.primaryEmotion || 'neutral',
        emotions: result.emotions || {
          joy: 0,
          sadness: 0,
          anger: 0,
          fear: 0,
          surprise: 0,
          disgust: 0,
          neutral: 1,
        },
        sentiment: result.sentiment || {
          polarity: 0,
          subjectivity: 0.5,
          label: 'neutral',
        },
        intensity: result.intensity || 0.5,
        toxicity: result.toxicity || 0,
        sarcasm: result.sarcasm || 0,
        urgency: result.urgency || 0.3,
        keyPhrases: result.keyPhrases || [],
        intents: result.intents || [],
      };
    } catch (error) {
      logger.error('Text emotion analysis failed', { error });
      throw error;
    }
  }

  /**
   * Analyze batch of texts
   */
  async analyzeBatch(texts: string[]): Promise<TextEmotionResult[]> {
    return Promise.all(texts.map((text) => this.analyze(text)));
  }

  /**
   * Analyze customer review
   */
  async analyzeReview(review: string, rating: number): Promise<{
    emotionAnalysis: TextEmotionResult;
    reviewQuality: number;
    helpfulness: number;
    authenticity: number;
    suggestions: string[];
  }> {
    const emotionAnalysis = await this.analyze(review);

    // Check if sentiment matches rating
    const sentimentRatingMatch =
      (rating >= 4 && emotionAnalysis.sentiment.label === 'positive') ||
      (rating <= 2 && emotionAnalysis.sentiment.label === 'negative') ||
      (rating === 3 && emotionAnalysis.sentiment.label === 'neutral');

    const reviewQuality = this.calculateReviewQuality(review, emotionAnalysis);
    const helpfulness = this.calculateHelpfulness(review, emotionAnalysis);
    const authenticity = sentimentRatingMatch ? 0.9 : 0.5;

    const suggestions: string[] = [];
    if (emotionAnalysis.toxicity > 0.5) {
      suggestions.push('Review contains potentially toxic content');
    }
    if (!sentimentRatingMatch) {
      suggestions.push('Sentiment-rating mismatch detected');
    }

    return {
      emotionAnalysis,
      reviewQuality,
      helpfulness,
      authenticity,
      suggestions,
    };
  }

  /**
   * Calculate review quality score
   */
  private calculateReviewQuality(text: string, analysis: TextEmotionResult): number {
    let score = 50;

    // Length bonus
    if (text.length > 100) score += 20;
    if (text.length > 300) score += 10;

    // Key phrases bonus
    score += Math.min(20, analysis.keyPhrases.length * 5);

    // Subjectivity penalty (too subjective = lower quality)
    score -= analysis.sentiment.subjectivity * 10;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate helpfulness score
   */
  private calculateHelpfulness(text: string, analysis: TextEmotionResult): number {
    let score = 50;

    // Specific details = helpful
    if (analysis.keyPhrases.length > 3) score += 30;

    // Moderate emotion = more helpful
    if (analysis.intensity > 0.3 && analysis.intensity < 0.7) score += 20;

    return Math.max(0, Math.min(100, score));
  }
}

export default TextEmotionAnalyzer;
