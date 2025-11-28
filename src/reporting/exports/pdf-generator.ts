/**
 * PDF Generator
 * Purpose: Generate PDF reports
 */

import PDFDocument from 'pdfkit';
import { logger } from '@/lib/logger';

export interface PDFOptions {
  title?: string;
  author?: string;
  subject?: string;
}

export class PDFGenerator {
  async generate(
    content: {
      title: string;
      sections: Array<{
        heading: string;
        data: Array<{ label: string; value: string | number }>;
      }>;
    },
    options?: PDFOptions
  ): Promise<Buffer> {
    logger.info('Generating PDF report', { title: content.title });

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument();
        const chunks: Buffer[] = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        // Metadata
        if (options?.title) doc.info.Title = options.title;
        if (options?.author) doc.info.Author = options.author;
        if (options?.subject) doc.info.Subject = options.subject;

        // Title
        doc.fontSize(20).text(content.title, { align: 'center' });
        doc.moveDown();

        // Sections
        for (const section of content.sections) {
          doc.fontSize(16).text(section.heading);
          doc.moveDown(0.5);

          for (const item of section.data) {
            doc.fontSize(12).text(`${item.label}: ${item.value}`);
          }

          doc.moveDown();
        }

        // Footer
        const now = new Date();
        doc.fontSize(10).text(
          `Generated on ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`,
          { align: 'center' }
        );

        doc.end();
      } catch (error) {
        logger.error('PDF generation failed', { error });
        reject(new Error('Failed to generate PDF'));
      }
    });
  }

  async generateTable(
    title: string,
    headers: string[],
    rows: string[][],
    options?: PDFOptions
  ): Promise<Buffer> {
    logger.info('Generating PDF table', { title, rows: rows.length });

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument();
        const chunks: Buffer[] = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        if (options?.title) doc.info.Title = options.title;

        doc.fontSize(20).text(title, { align: 'center' });
        doc.moveDown();

        // Simple table rendering
        doc.fontSize(12).text(headers.join(' | '));
        doc.moveDown(0.5);

        for (const row of rows) {
          doc.fontSize(10).text(row.join(' | '));
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}

export default PDFGenerator;
