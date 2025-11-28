/**
 * Live Chat System
 * Purpose: Real-time customer support chat
 */

import { Server as SocketIOServer } from 'socket.io';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface ChatMessage {
  id?: number;
  conversationId: number;
  senderId: number;
  senderType: 'customer' | 'agent';
  message: string;
  timestamp: Date;
}

export class LiveChat {
  private io: SocketIOServer;

  constructor(io: SocketIOServer) {
    this.io = io;
    this.setupEventHandlers();
  }

  /**
   * Setup socket event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      logger.info('Client connected to live chat', { socketId: socket.id });

      socket.on('join-conversation', (conversationId: number) => {
        socket.join(`conversation-${conversationId}`);
        logger.info('Client joined conversation', { conversationId });
      });

      socket.on('send-message', async (data: ChatMessage) => {
        await this.handleMessage(data);
      });

      socket.on('typing', (data: { conversationId: number; userId: number }) => {
        socket.to(`conversation-${data.conversationId}`).emit('user-typing', {
          userId: data.userId,
        });
      });

      socket.on('disconnect', () => {
        logger.info('Client disconnected from live chat', { socketId: socket.id });
      });
    });
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(data: ChatMessage): Promise<void> {
    logger.info('Handling chat message', {
      conversationId: data.conversationId,
      senderId: data.senderId,
    });

    const message = await prisma.chatMessage.create({
      data: {
        conversation_id: data.conversationId,
        sender_id: data.senderId,
        sender_type: data.senderType,
        message: data.message,
        created_at: new Date(),
      },
    });

    // Broadcast to conversation participants
    this.io.to(`conversation-${data.conversationId}`).emit('new-message', {
      ...message,
      timestamp: message.created_at,
    });

    // Update conversation last activity
    await prisma.conversation.update({
      where: { id: data.conversationId },
      data: { last_message_at: new Date() },
    });
  }

  /**
   * Create new conversation
   */
  async createConversation(customerId: number, subject?: string): Promise<number> {
    const conversation = await prisma.conversation.create({
      data: {
        customer_id: customerId,
        subject,
        status: 'open',
        created_at: new Date(),
        last_message_at: new Date(),
      },
    });

    logger.info('Conversation created', { id: conversation.id });
    return conversation.id;
  }

  /**
   * Assign agent to conversation
   */
  async assignAgent(conversationId: number, agentId: number): Promise<void> {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { agent_id: agentId },
    });

    this.io.to(`conversation-${conversationId}`).emit('agent-assigned', { agentId });
  }

  /**
   * Close conversation
   */
  async closeConversation(conversationId: number): Promise<void> {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: 'closed',
        closed_at: new Date(),
      },
    });

    this.io.to(`conversation-${conversationId}`).emit('conversation-closed');
  }

  /**
   * Get conversation history
   */
  async getHistory(conversationId: number, limit: number = 100): Promise<ChatMessage[]> {
    const messages = await prisma.chatMessage.findMany({
      where: { conversation_id: conversationId },
      orderBy: { created_at: 'desc' },
      take: limit,
    });

    return messages.reverse().map(m => ({
      id: m.id,
      conversationId: m.conversation_id,
      senderId: m.sender_id,
      senderType: m.sender_type as any,
      message: m.message,
      timestamp: m.created_at,
    }));
  }

  /**
   * Get active conversations for agent
   */
  async getActiveConversations(agentId: number) {
    return await prisma.conversation.findMany({
      where: {
        agent_id: agentId,
        status: 'open',
      },
      orderBy: { last_message_at: 'desc' },
      include: {
        customer: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }
}

export default LiveChat;
