/**
 * Template Engine
 * Purpose: Render notification templates with dynamic data
 */

import Handlebars from 'handlebars';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

export interface Template {
  id: string;
  name: string;
  subject?: string;
  body: string;
  type: 'email' | 'push' | 'sms';
  variables: string[];
}

export class TemplateEngine {
  private cache: Map<string, HandlebarsTemplateDelegate>;

  constructor() {
    this.cache = new Map();
    this.registerHelpers();
  }

  private registerHelpers(): void {
    Handlebars.registerHelper('formatCurrency', (amount: number) => {
      return `$${(amount / 100).toFixed(2)}`;
    });

    Handlebars.registerHelper('formatDate', (date: Date) => {
      return new Date(date).toLocaleDateString();
    });

    Handlebars.registerHelper('uppercase', (str: string) => {
      return str.toUpperCase();
    });
  }

  async render(
    templateId: string,
    data: Record<string, any>
  ): Promise<{ subject?: string; body: string }> {
    const template = await this.getTemplate(templateId);
    
    const compiledBody = this.compile(template.body);
    const body = compiledBody(data);

    let subject: string | undefined;
    if (template.subject) {
      const compiledSubject = this.compile(template.subject);
      subject = compiledSubject(data);
    }

    return { subject, body };
  }

  private compile(template: string): HandlebarsTemplateDelegate {
    if (this.cache.has(template)) {
      return this.cache.get(template)!;
    }

    const compiled = Handlebars.compile(template);
    this.cache.set(template, compiled);
    return compiled;
  }

  private async getTemplate(id: string): Promise<Template> {
    const template = await prisma.notificationTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new Error(`Template not found: ${id}`);
    }

    return {
      id: template.id,
      name: template.name,
      subject: template.subject || undefined,
      body: template.body,
      type: template.type as any,
      variables: JSON.parse(template.variables || '[]'),
    };
  }

  async createTemplate(template: Omit<Template, 'id'>): Promise<string> {
    const created = await prisma.notificationTemplate.create({
      data: {
        name: template.name,
        subject: template.subject,
        body: template.body,
        type: template.type,
        variables: JSON.stringify(template.variables),
      },
    });

    logger.info('Template created', { id: created.id, name: template.name });
    return created.id;
  }
}

export default TemplateEngine;
