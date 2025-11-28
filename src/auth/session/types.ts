/**
 * Session Types
 * Purpose: TypeScript types for session management
 */

export interface Session {
  id: string;
  userId: number;
  email: string;
  role: string;
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  expiresAt: Date;
  metadata?: Record<string, any>;
}

export interface SessionData {
  userId: number;
  email: string;
  role: string;
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export interface SessionOptions {
  maxAge?: number; // seconds
  rolling?: boolean;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
}

export default Session;
