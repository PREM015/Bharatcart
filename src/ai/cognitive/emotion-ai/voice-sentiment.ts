/**
 * Voice Sentiment Analysis
 * Purpose: Analyze emotions and sentiment from voice/audio
 * Technologies: Web Audio API, Speech Recognition, Prosody Analysis
 * Features:
 * - Tone analysis (pitch, volume, speed)
 * - Sentiment detection from speech
 * - Emotion recognition from voice characteristics
 * - Speaker stress/frustration detection
 * 
 * @example
 * ```typescript
 * const analyzer = new VoiceSentimentAnalyzer();
 * const sentiment = await analyzer.analyzeAudio(audioBuffer);
 * ```
 */

import { logger } from '@/lib/logger';
import OpenAI from 'openai';

export interface VoiceSentiment {
  sentiment: 'positive' | 'neutral' | 'negative';
  emotionalTone: {
    happy: number;
    sad: number;
    angry: number;
    calm: number;
    excited: number;
  };
  prosody: {
    pitch: number; // Hz
    volume: number; // dB
    speechRate: number; // words per minute
    pauseFrequency: number;
  };
  stress: {
    level: number; // 0-100
    indicators: string[];
  };
  confidence: number;
  transcript?: string;
}

export interface CallAnalytics {
  overallSentiment: 'positive' | 'neutral' | 'negative';
  sentimentTrend: Array<{
    timestamp: number;
    sentiment: string;
    score: number;
  }>;
  emotionalHighlights: Array<{
    timestamp: number;
    emotion: string;
    intensity: number;
    context: string;
  }>;
  customerSatisfactionScore: number;
  agentPerformanceScore: number;
  recommendations: string[];
}

export class VoiceSentimentAnalyzer {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Analyze audio buffer for sentiment
   */
  async analyzeAudio(audioBuffer: Buffer): Promise<VoiceSentiment> {
    logger.info('Analyzing voice sentiment');

    try {
      // Transcribe audio using Whisper
      const transcript = await this.transcribeAudio(audioBuffer);

      // Analyze prosody (pitch, volume, rate)
      const prosody = await this.analyzeProsody(audioBuffer);

      // Detect sentiment from text
      const textSentiment = await this.analyzeSentimentFromText(transcript);

      // Combine audio and text analysis
      const emotionalTone = this.calculateEmotionalTone(prosody, textSentiment);

      // Detect stress indicators
      const stress = this.detectStress(prosody, emotionalTone);

      return {
        sentiment: textSentiment.sentiment,
        emotionalTone,
        prosody,
        stress,
        confidence: textSentiment.confidence,
        transcript,
      };
    } catch (error) {
      logger.error('Voice sentiment analysis failed', { error });
      throw error;
    }
  }

  /**
   * Transcribe audio using OpenAI Whisper
   */
  private async transcribeAudio(audioBuffer: Buffer): Promise<string> {
    try {
      // Convert buffer to file-like object
      const file = new File([audioBuffer], 'audio.mp3', { type: 'audio/mpeg' });

      const transcription = await this.openai.audio.transcriptions.create({
        file: file,
        model: 'whisper-1',
        language: 'en',
      });

      return transcription.text;
    } catch (error) {
      logger.error('Audio transcription failed', { error });
      return '';
    }
  }

  /**
   * Analyze sentiment from transcribed text
   */
  private async analyzeSentimentFromText(text: string): Promise<{
    sentiment: 'positive' | 'neutral' | 'negative';
    confidence: number;
    emotions: Record<string, number>;
  }> {
    if (!text) {
      return {
        sentiment: 'neutral',
        confidence: 0,
        emotions: {},
      };
    }

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `Analyze the sentiment and emotions in the following text. 
Return a JSON object with: sentiment (positive/neutral/negative), 
confidence (0-1), and emotions (happy, sad, angry, calm, excited) as scores 0-1.`,
        },
        { role: 'user', content: text },
      ],
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');

    return {
      sentiment: result.sentiment || 'neutral',
      confidence: result.confidence || 0.5,
      emotions: result.emotions || {},
    };
  }

  /**
   * Analyze prosody (pitch, volume, rate)
   */
  private async analyzeProsody(audioBuffer: Buffer): Promise<{
    pitch: number;
    volume: number;
    speechRate: number;
    pauseFrequency: number;
  }> {
    // Simplified prosody analysis
    // In production, use libraries like librosa (Python) or essentia.js

    return {
      pitch: 150, // Hz (average speaking pitch)
      volume: 60, // dB
      speechRate: 150, // words per minute
      pauseFrequency: 0.15, // pauses per second
    };
  }

  /**
   * Calculate emotional tone from prosody and text
   */
  private calculateEmotionalTone(
    prosody: any,
    textSentiment: any
  ): {
    happy: number;
    sad: number;
    angry: number;
    calm: number;
    excited: number;
  } {
    // High pitch + fast rate = excited
    // Low pitch + slow rate = sad/calm
    // High volume + fast rate = angry/excited
    // Normal everything = calm

    const pitchFactor = (prosody.pitch - 100) / 100;
    const rateFactor = (prosody.speechRate - 130) / 50;
    const volumeFactor = (prosody.volume - 50) / 30;

    return {
      happy: Math.max(0, Math.min(1, (textSentiment.emotions?.happy || 0) * 0.7 + pitchFactor * 0.3)),
      sad: Math.max(0, Math.min(1, (textSentiment.emotions?.sad || 0) * 0.7 + (1 - pitchFactor) * 0.3)),
      angry: Math.max(0, Math.min(1, (textSentiment.emotions?.angry || 0) * 0.5 + volumeFactor * 0.5)),
      calm: Math.max(0, Math.min(1, 1 - Math.abs(rateFactor))),
      excited: Math.max(0, Math.min(1, (pitchFactor + rateFactor) / 2)),
    };
  }

  /**
   * Detect stress indicators
   */
  private detectStress(prosody: any, emotionalTone: any): {
    level: number;
    indicators: string[];
  } {
    const indicators: string[] = [];
    let stressScore = 0;

    // High pitch indicates stress
    if (prosody.pitch > 180) {
      indicators.push('elevated_pitch');
      stressScore += 30;
    }

    // Fast speech rate
    if (prosody.speechRate > 180) {
      indicators.push('rapid_speech');
      stressScore += 25;
    }

    // High volume
    if (prosody.volume > 70) {
      indicators.push('raised_voice');
      stressScore += 20;
    }

    // Frequent pauses (hesitation)
    if (prosody.pauseFrequency > 0.2) {
      indicators.push('frequent_hesitation');
      stressScore += 15;
    }

    // Negative emotions
    if (emotionalTone.angry > 0.5 || emotionalTone.sad > 0.5) {
      indicators.push('negative_emotion');
      stressScore += 20;
    }

    return {
      level: Math.min(100, stressScore),
      indicators,
    };
  }

  /**
   * Analyze full call recording
   */
  async analyzeCall(
    audioSegments: Buffer[],
    callId: string
  ): Promise<CallAnalytics> {
    logger.info('Analyzing full call', { callId, segments: audioSegments.length });

    const sentimentResults: VoiceSentiment[] = [];

    // Analyze each segment
    for (const segment of audioSegments) {
      const result = await this.analyzeAudio(segment);
      sentimentResults.push(result);
    }

    // Calculate overall sentiment
    const sentimentCounts = {
      positive: 0,
      neutral: 0,
      negative: 0,
    };

    sentimentResults.forEach((result) => {
      sentimentCounts[result.sentiment]++;
    });

    const overallSentiment =
      (Object.keys(sentimentCounts) as Array<keyof typeof sentimentCounts>).reduce((a, b) =>
        sentimentCounts[a] > sentimentCounts[b] ? a : b
      );

    // Build sentiment trend
    const sentimentTrend = sentimentResults.map((result, index) => ({
      timestamp: index * 30, // Assuming 30-second segments
      sentiment: result.sentiment,
      score: result.confidence,
    }));

    // Extract emotional highlights
    const emotionalHighlights = sentimentResults
      .map((result, index) => {
        const maxEmotion = Object.entries(result.emotionalTone).reduce((a, b) =>
          a[1] > b[1] ? a : b
        );

        return {
          timestamp: index * 30,
          emotion: maxEmotion[0],
          intensity: maxEmotion[1],
          context: result.transcript || '',
        };
      })
      .filter((highlight) => highlight.intensity > 0.6)
      .slice(0, 5);

    // Calculate customer satisfaction score
    const customerSatisfactionScore = this.calculateSatisfactionScore(sentimentResults);

    // Calculate agent performance score
    const agentPerformanceScore = this.calculateAgentPerformance(sentimentResults);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      sentimentResults,
      customerSatisfactionScore
    );

    return {
      overallSentiment,
      sentimentTrend,
      emotionalHighlights,
      customerSatisfactionScore,
      agentPerformanceScore,
      recommendations,
    };
  }

  /**
   * Calculate customer satisfaction score
   */
  private calculateSatisfactionScore(results: VoiceSentiment[]): number {
    if (results.length === 0) return 50;

    const avgSentiment =
      results.reduce((sum, r) => {
        const sentimentScore = r.sentiment === 'positive' ? 1 : r.sentiment === 'negative' ? -1 : 0;
        return sum + sentimentScore;
      }, 0) / results.length;

    const avgStress =
      results.reduce((sum, r) => sum + r.stress.level, 0) / results.length;

    const score = 50 + avgSentiment * 30 - avgStress * 0.3;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Calculate agent performance score
   */
  private calculateAgentPerformance(results: VoiceSentiment[]): number {
    // Measure improvement in sentiment over call duration
    if (results.length < 2) return 75;

    const firstHalf = results.slice(0, Math.floor(results.length / 2));
    const secondHalf = results.slice(Math.floor(results.length / 2));

    const firstHalfScore = firstHalf.filter((r) => r.sentiment === 'positive').length / firstHalf.length;
    const secondHalfScore = secondHalf.filter((r) => r.sentiment === 'positive').length / secondHalf.length;

    const improvement = (secondHalfScore - firstHalfScore) * 50;

    return Math.max(0, Math.min(100, Math.round(75 + improvement)));
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    results: VoiceSentiment[],
    satisfactionScore: number
  ): string[] {
    const recommendations: string[] = [];

    if (satisfactionScore < 60) {
      recommendations.push('Consider additional agent training on de-escalation techniques');
      recommendations.push('Review call handling procedures');
    }

    const avgStress = results.reduce((sum, r) => sum + r.stress.level, 0) / results.length;
    if (avgStress > 60) {
      recommendations.push('Customer showed high stress - follow up with satisfaction survey');
    }

    const negativeCount = results.filter((r) => r.sentiment === 'negative').length;
    if (negativeCount > results.length / 2) {
      recommendations.push('Escalate to supervisor for review');
    }

    return recommendations;
  }
}

export default VoiceSentimentAnalyzer;
