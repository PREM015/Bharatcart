/**
 * SMS Templates
 * Purpose: Manage SMS message templates
 */

import { logger } from '@/lib/logger';

export interface SMSTemplate {
  id: string;
  name: string;
  content: string;
  variables: string[];
}

export class SMSTemplates {
  private templates: Map<string, SMSTemplate>;

  constructor() {
    this.templates = new Map();
    this.initializeDefaultTemplates();
  }

  /**
   * Initialize default templates
   */
  private initializeDefaultTemplates(): void {
    this.add({
      id: 'otp',
      name: 'OTP Verification',
      content: 'Your OTP is {otp}. Valid for 10 minutes. Do not share.',
      variables: ['otp'],
    });

    this.add({
      id: 'order_confirmation',
      name: 'Order Confirmation',
      content: 'Order #{orderId} confirmed! Total: ${total}. Track: {trackingUrl}',
      variables: ['orderId', 'total', 'trackingUrl'],
    });

    this.add({
      id: 'order_shipped',
      name: 'Order Shipped',
      content: 'Your order #{orderId} has shipped! Track: {trackingUrl}',
      variables: ['orderId', 'trackingUrl'],
    });

    this.add({
      id: 'password_reset',
      name: 'Password Reset',
      content: 'Reset your password using code: {code}. Valid for 30 minutes.',
      variables: ['code'],
    });
  }

  /**
   * Add template
   */
  add(template: SMSTemplate): void {
    this.templates.set(template.id, template);
    logger.info('SMS template added', { id: template.id });
  }

  /**
   * Get template
   */
  get(id: string): SMSTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Render template with data
   */
  render(templateId: string, data: Record<string, any>): string {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    let content = template.content;

    for (const variable of template.variables) {
      const value = data[variable];
      if (value === undefined) {
        logger.warn('Missing template variable', { templateId, variable });
        continue;
      }

      content = content.replace(new RegExp(`\{${variable}\}`, 'g'), String(value));
    }

    return content;
  }

  /**
   * List all templates
   */
  listAll(): SMSTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Delete template
   */
  delete(id: string): boolean {
    return this.templates.delete(id);
  }

  /**
   * Validate template
   */
  validate(content: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check length (160 characters for single SMS)
    if (content.length > 160) {
      errors.push('Content exceeds 160 characters (single SMS limit)');
    }

    // Check for unclosed variables
    const openBraces = (content.match(/\{/g) || []).length;
    const closeBraces = (content.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      errors.push('Unclosed variable brackets');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export default SMSTemplates;
