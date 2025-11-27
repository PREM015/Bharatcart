/**
 * Vendor Agreement System
 * Purpose: Manage vendor contracts and terms of service
 * Description: Digital signing, contract templates, amendments
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import PDFDocument from 'pdfkit';
import { createHash } from 'crypto';

export interface AgreementTemplate {
  id: number;
  name: string;
  version: string;
  terms: string;
  commission_rate: number;
  payment_terms: string;
  termination_clause: string;
  dispute_resolution: string;
}

export interface AgreementRequest {
  vendor_id: number;
  template_id: number;
  custom_terms?: Record<string, any>;
  signatory: {
    name: string;
    title: string;
    email: string;
  };
}

export interface SignatureData {
  signature_image?: string;
  ip_address: string;
  user_agent: string;
  timestamp: Date;
  acceptance_method: 'click' | 'esignature' | 'physical';
}

export class VendorAgreement {
  /**
   * Create vendor agreement
   */
  async createAgreement(request: AgreementRequest): Promise<string> {
    logger.info('Creating vendor agreement', {
      vendor_id: request.vendor_id,
      template_id: request.template_id,
    });

    try {
      // Get template
      const template = await prisma.agreementTemplate.findUnique({
        where: { id: request.template_id },
      });

      if (!template) {
        throw new Error('Agreement template not found');
      }

      // Generate agreement document
      const agreementData = await this.generateAgreementDocument(
        template,
        request
      );

      // Create agreement record
      const agreement = await prisma.vendorAgreement.create({
        data: {
          vendor_id: request.vendor_id,
          template_id: request.template_id,
          agreement_number: this.generateAgreementNumber(),
          version: template.version,
          terms: agreementData.terms,
          commission_rate: template.commission_rate,
          payment_terms: template.payment_terms,
          custom_terms: JSON.stringify(request.custom_terms || {}),
          document_url: agreementData.document_url,
          document_hash: agreementData.document_hash,
          status: 'PENDING_SIGNATURE',
          created_at: new Date(),
        },
      });

      // Send for signature
      await this.sendForSignature(agreement.id, request.signatory);

      logger.info('Agreement created successfully', {
        agreement_id: agreement.id,
      });

      return agreement.id.toString();
    } catch (error) {
      logger.error('Failed to create agreement', { error });
      throw error;
    }
  }

  /**
   * Generate agreement document
   */
  private async generateAgreementDocument(
    template: any,
    request: AgreementRequest
  ): Promise<{ terms: string; document_url: string; document_hash: string }> {
    // Get vendor details
    const vendor = await prisma.vendor.findUnique({
      where: { id: request.vendor_id },
    });

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    // Replace template placeholders
    let terms = template.terms;
    terms = terms.replace('{{VENDOR_NAME}}', vendor.business_name);
    terms = terms.replace('{{VENDOR_EMAIL}}', vendor.email);
    terms = terms.replace('{{COMMISSION_RATE}}', template.commission_rate.toString());
    terms = terms.replace('{{DATE}}', new Date().toLocaleDateString());
    terms = terms.replace('{{AGREEMENT_NUMBER}}', this.generateAgreementNumber());

    // Apply custom terms
    if (request.custom_terms) {
      for (const [key, value] of Object.entries(request.custom_terms)) {
        terms = terms.replace(`{{${key}}}`, value as string);
      }
    }

    // Generate PDF document
    const documentUrl = await this.generatePDF(terms, vendor.business_name);

    // Calculate document hash for integrity
    const documentHash = createHash('sha256').update(terms).digest('hex');

    return {
      terms,
      document_url: documentUrl,
      document_hash: documentHash,
    };
  }

  /**
   * Generate PDF document
   */
  private async generatePDF(content: string, vendorName: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const filename = `agreement_${Date.now()}.pdf`;
      const filepath = `uploads/agreements/${filename}`;

      // In production, save to cloud storage
      // For now, return mock URL
      const documentUrl = `/documents/agreements/${filename}`;

      // Add content to PDF
      doc
        .fontSize(20)
        .text('VENDOR AGREEMENT', { align: 'center' })
        .moveDown();

      doc
        .fontSize(12)
        .text(`Between: BharatCart Marketplace`)
        .text(`And: ${vendorName}`)
        .moveDown();

      doc.fontSize(10).text(content);

      doc.end();

      resolve(documentUrl);
    });
  }

  /**
   * Send agreement for signature
   */
  private async sendForSignature(
    agreementId: number,
    signatory: AgreementRequest['signatory']
  ): Promise<void> {
    const agreement = await prisma.vendorAgreement.findUnique({
      where: { id: agreementId },
    });

    if (!agreement) {
      throw new Error('Agreement not found');
    }

    // Send email with signature link
    await sendEmail({
      to: signatory.email,
      subject: 'Vendor Agreement - Signature Required',
      template: 'vendor_agreement_signature',
      data: {
        signatory_name: signatory.name,
        agreement_number: agreement.agreement_number,
        signature_link: `${process.env.APP_URL}/vendor/agreements/${agreementId}/sign`,
        document_url: agreement.document_url,
      },
    });

    logger.info('Agreement sent for signature', {
      agreement_id: agreementId,
      signatory_email: signatory.email,
    });
  }

  /**
   * Sign agreement
   */
  async signAgreement(
    agreementId: number,
    signatureData: SignatureData
  ): Promise<void> {
    logger.info('Signing agreement', { agreement_id: agreementId });

    const agreement = await prisma.vendorAgreement.findUnique({
      where: { id: agreementId },
    });

    if (!agreement) {
      throw new Error('Agreement not found');
    }

    if (agreement.status !== 'PENDING_SIGNATURE') {
      throw new Error('Agreement is not pending signature');
    }

    // Record signature
    await prisma.vendorAgreement.update({
      where: { id: agreementId },
      data: {
        status: 'SIGNED',
        signed_at: signatureData.timestamp,
        signature_data: JSON.stringify({
          signature_image: signatureData.signature_image,
          ip_address: signatureData.ip_address,
          user_agent: signatureData.user_agent,
          acceptance_method: signatureData.acceptance_method,
        }),
      },
    });

    // Create signature log
    await prisma.agreementSignatureLog.create({
      data: {
        agreement_id: agreementId,
        ip_address: signatureData.ip_address,
        user_agent: signatureData.user_agent,
        timestamp: signatureData.timestamp,
      },
    });

    // Update vendor status
    await prisma.vendor.update({
      where: { id: agreement.vendor_id },
      data: {
        agreement_signed: true,
        status: 'ACTIVE',
      },
    });

    // Notify admin
    await sendEmail({
      to: process.env.ADMIN_EMAIL!,
      subject: 'New Vendor Agreement Signed',
      template: 'admin_agreement_signed',
      data: {
        agreement_number: agreement.agreement_number,
        vendor_id: agreement.vendor_id,
      },
    });

    logger.info('Agreement signed successfully', { agreement_id: agreementId });
  }

  /**
   * Amend agreement
   */
  async amendAgreement(
    agreementId: number,
    amendments: Record<string, any>,
    reason: string
  ): Promise<string> {
    logger.info('Amending agreement', { agreement_id: agreementId });

    const currentAgreement = await prisma.vendorAgreement.findUnique({
      where: { id: agreementId },
    });

    if (!currentAgreement) {
      throw new Error('Agreement not found');
    }

    // Create amendment record
    const amendment = await prisma.agreementAmendment.create({
      data: {
        agreement_id: agreementId,
        amendment_number: this.generateAmendmentNumber(agreementId),
        changes: JSON.stringify(amendments),
        reason,
        status: 'PENDING_APPROVAL',
        created_at: new Date(),
      },
    });

    // Notify vendor
    const vendor = await prisma.vendor.findUnique({
      where: { id: currentAgreement.vendor_id },
    });

    if (vendor) {
      await sendEmail({
        to: vendor.email,
        subject: 'Agreement Amendment Required',
        template: 'vendor_agreement_amendment',
        data: {
          agreement_number: currentAgreement.agreement_number,
          amendment_number: amendment.amendment_number,
          reason,
        },
      });
    }

    return amendment.id.toString();
  }

  /**
   * Terminate agreement
   */
  async terminateAgreement(
    agreementId: number,
    terminatedBy: 'vendor' | 'platform',
    reason: string,
    noticePeriod: number = 30
  ): Promise<void> {
    logger.info('Terminating agreement', {
      agreement_id: agreementId,
      terminated_by: terminatedBy,
    });

    const agreement = await prisma.vendorAgreement.findUnique({
      where: { id: agreementId },
    });

    if (!agreement) {
      throw new Error('Agreement not found');
    }

    const terminationDate = new Date();
    terminationDate.setDate(terminationDate.getDate() + noticePeriod);

    await prisma.vendorAgreement.update({
      where: { id: agreementId },
      data: {
        status: 'TERMINATED',
        termination_date: terminationDate,
        termination_reason: reason,
        terminated_by: terminatedBy,
      },
    });

    // Update vendor status
    await prisma.vendor.update({
      where: { id: agreement.vendor_id },
      data: {
        status: 'SUSPENDED',
        suspension_reason: `Agreement terminated: ${reason}`,
      },
    });

    logger.info('Agreement terminated', {
      agreement_id: agreementId,
      termination_date: terminationDate,
    });
  }

  /**
   * Generate agreement number
   */
  private generateAgreementNumber(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 7);
    return `AGR-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Generate amendment number
   */
  private generateAmendmentNumber(agreementId: number): string {
    return `AMD-${agreementId}-${Date.now()}`;
  }

  /**
   * Get agreement status
   */
  async getAgreementStatus(vendorId: number): Promise<any> {
    const agreement = await prisma.vendorAgreement.findFirst({
      where: { vendor_id: vendorId },
      orderBy: { created_at: 'desc' },
      include: {
        amendments: true,
      },
    });

    if (!agreement) {
      return {
        status: 'not_created',
        message: 'No agreement found',
      };
    }

    return {
      agreement_number: agreement.agreement_number,
      status: agreement.status.toLowerCase(),
      version: agreement.version,
      signed_at: agreement.signed_at,
      commission_rate: agreement.commission_rate,
      document_url: agreement.document_url,
      amendments: agreement.amendments.map(a => ({
        amendment_number: a.amendment_number,
        status: a.status,
        created_at: a.created_at,
      })),
    };
  }
}

export default VendorAgreement;
