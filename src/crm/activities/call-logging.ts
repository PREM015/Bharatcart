/**
 * Call Logging System
 * Purpose: Log and track phone calls with contacts
 * Description: Call recording, transcription, sentiment analysis
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { ActivityTrackingSystem } from './activity-tracking';

export interface CallLog {
  id?: number;
  contact_id: number;
  user_id: number;
  phone_number: string;
  direction: 'inbound' | 'outbound';
  duration_seconds: number;
  outcome: 'connected' | 'voicemail' | 'no_answer' | 'busy' | 'failed';
  recording_url?: string;
  transcription?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  notes?: string;
  scheduled_followup?: Date;
  created_at?: Date;
}

export class CallLoggingSystem {
  private activityTracker: ActivityTrackingSystem;

  constructor(activityTracker: ActivityTrackingSystem) {
    this.activityTracker = activityTracker;
  }

  /**
   * Log call
   */
  async logCall(call: CallLog): Promise<CallLog> {
    logger.info('Logging call', {
      contact_id: call.contact_id,
      direction: call.direction,
      outcome: call.outcome,
    });

    const created = await prisma.callLog.create({
      data: {
        contact_id: call.contact_id,
        user_id: call.user_id,
        phone_number: call.phone_number,
        direction: call.direction,
        duration_seconds: call.duration_seconds,
        outcome: call.outcome,
        recording_url: call.recording_url,
        transcription: call.transcription,
        sentiment: call.sentiment,
        notes: call.notes,
        scheduled_followup: call.scheduled_followup,
        created_at: new Date(),
      },
    });

    // Also log as activity
    await this.activityTracker.logActivity({
      type: 'call',
      contact_id: call.contact_id,
      user_id: call.user_id,
      subject: `${call.direction} call - ${call.outcome}`,
      description: call.notes || `Call duration: ${Math.floor(call.duration_seconds / 60)} minutes`,
      direction: call.direction,
      duration_minutes: Math.floor(call.duration_seconds / 60),
      outcome: call.outcome,
      metadata: {
        phone_number: call.phone_number,
        recording_url: call.recording_url,
        sentiment: call.sentiment,
      },
    });

    return this.mapToCallLog(created);
  }

  /**
   * Get contact call history
   */
  async getCallHistory(contactId: number): Promise<CallLog[]> {
    const calls = await prisma.callLog.findMany({
      where: { contact_id: contactId },
      orderBy: { created_at: 'desc' },
    });

    return calls.map(c => this.mapToCallLog(c));
  }

  /**
   * Get call statistics
   */
  async getCallStats(userId?: number, dateRange?: { start: Date; end: Date }): Promise<any> {
    const where: any = {};

    if (userId) where.user_id = userId;
    if (dateRange) {
      where.created_at = {
        gte: dateRange.start,
        lte: dateRange.end,
      };
    }

    const [total, byOutcome, avgDuration] = await Promise.all([
      prisma.callLog.count({ where }),
      prisma.callLog.groupBy({
        by: ['outcome'],
        where,
        _count: true,
      }),
      prisma.callLog.aggregate({
        where,
        _avg: {
          duration_seconds: true,
        },
      }),
    ]);

    const byOutcomeMap: Record<string, number> = {};
    byOutcome.forEach(item => {
      byOutcomeMap[item.outcome] = item._count;
    });

    const connectedCalls = byOutcomeMap['connected'] || 0;
    const totalCalls = total;

    return {
      total_calls: totalCalls,
      connected_calls: connectedCalls,
      connection_rate: totalCalls > 0 ? (connectedCalls / totalCalls) * 100 : 0,
      avg_duration_minutes: avgDuration._avg.duration_seconds
        ? Math.floor(avgDuration._avg.duration_seconds / 60)
        : 0,
      by_outcome: byOutcomeMap,
    };
  }

  /**
   * Transcribe call
   */
  async transcribeCall(callId: number, audioUrl: string): Promise<string> {
    logger.info('Transcribing call', { call_id: callId });

    // Integration with transcription service (e.g., AWS Transcribe, Google Speech-to-Text)
    const transcription = await this.getTranscription(audioUrl);

    await prisma.callLog.update({
      where: { id: callId },
      data: {
        transcription,
      },
    });

    return transcription;
  }

  /**
   * Get transcription from audio
   */
  private async getTranscription(audioUrl: string): Promise<string> {
    // Placeholder - integrate with actual transcription service
    logger.info('Getting transcription', { audio_url: audioUrl });

    // Mock transcription
    return 'This is a placeholder transcription. Integrate with AWS Transcribe or similar service.';
  }

  /**
   * Analyze call sentiment
   */
  async analyzeCallSentiment(callId: number): Promise<'positive' | 'neutral' | 'negative'> {
    logger.info('Analyzing call sentiment', { call_id: callId });

    const call = await prisma.callLog.findUnique({
      where: { id: callId },
    });

    if (!call || !call.transcription) {
      throw new Error('Call transcription not available');
    }

    // Use sentiment analysis service (e.g., AWS Comprehend, Google Natural Language)
    const sentiment = await this.analyzeSentiment(call.transcription);

    await prisma.callLog.update({
      where: { id: callId },
      data: { sentiment },
    });

    return sentiment;
  }

  /**
   * Analyze sentiment from text
   */
  private async analyzeSentiment(text: string): Promise<'positive' | 'neutral' | 'negative'> {
    // Placeholder - integrate with actual sentiment analysis service
    logger.info('Analyzing sentiment');

    // Simple keyword-based sentiment (replace with ML model)
    const positiveWords = ['great', 'excellent', 'good', 'interested', 'yes', 'perfect'];
    const negativeWords = ['no', 'not interested', 'expensive', 'problem', 'issue', 'cancel'];

    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * Schedule follow-up call
   */
  async scheduleFollowup(
    contactId: number,
    userId: number,
    scheduledAt: Date,
    notes?: string
  ): Promise<void> {
    logger.info('Scheduling follow-up call', {
      contact_id: contactId,
      scheduled_at: scheduledAt,
    });

    await this.activityTracker.logActivity({
      type: 'call',
      contact_id: contactId,
      user_id: userId,
      subject: 'Follow-up call',
      description: notes || 'Scheduled follow-up call',
      scheduled_at: scheduledAt,
    });
  }

  /**
   * Map database record to CallLog
   */
  private mapToCallLog(record: any): CallLog {
    return {
      id: record.id,
      contact_id: record.contact_id,
      user_id: record.user_id,
      phone_number: record.phone_number,
      direction: record.direction,
      duration_seconds: record.duration_seconds,
      outcome: record.outcome,
      recording_url: record.recording_url,
      transcription: record.transcription,
      sentiment: record.sentiment,
      notes: record.notes,
      scheduled_followup: record.scheduled_followup,
      created_at: record.created_at,
    };
  }
}

export default CallLoggingSystem;
