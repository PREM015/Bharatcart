/**
 * Vendor Verification System
 * Purpose: Verify vendor identity and business credentials
 * Description: Document verification, business validation, compliance checks
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { sendEmail } from '@/lib/email';

export interface VerificationDocument {
  type: 'business_license' | 'tax_id' | 'bank_statement' | 'identity_proof' | 'address_proof';
  document_url: string;
  document_number?: string;
  issued_date?: Date;
  expiry_date?: Date;
}

export interface VerificationRequest {
  vendor_id: number;
  business_name: string;
  business_type: 'individual' | 'company' | 'partnership' | 'llc';
  registration_number?: string;
  tax_id: string;
  documents: VerificationDocument[];
  contact_person: {
    name: string;
    email: string;
    phone: string;
    designation: string;
  };
}

export interface VerificationResult {
  status: 'approved' | 'rejected' | 'pending' | 'requires_info';
  verified_at?: Date;
  verification_score: number;
  issues: string[];
  next_steps: string[];
}

export class VendorVerification {
  /**
   * Submit vendor for verification
   */
  async submitVerification(request: VerificationRequest): Promise<string> {
    logger.info('Submitting vendor verification', {
      vendor_id: request.vendor_id,
      business_name: request.business_name,
    });

    try {
      // Create verification record
      const verification = await prisma.vendorVerification.create({
        data: {
          vendor_id: request.vendor_id,
          business_name: request.business_name,
          business_type: request.business_type,
          registration_number: request.registration_number,
          tax_id: request.tax_id,
          contact_person: JSON.stringify(request.contact_person),
          status: 'PENDING',
          submitted_at: new Date(),
        },
      });

      // Save documents
      for (const doc of request.documents) {
        await prisma.verificationDocument.create({
          data: {
            verification_id: verification.id,
            document_type: doc.type,
            document_url: doc.document_url,
            document_number: doc.document_number,
            issued_date: doc.issued_date,
            expiry_date: doc.expiry_date,
            status: 'PENDING',
          },
        });
      }

      // Queue for automated verification
      await this.queueAutomatedVerification(verification.id);

      // Notify vendor
      await sendEmail({
        to: request.contact_person.email,
        subject: 'Verification Submitted Successfully',
        template: 'vendor_verification_submitted',
        data: {
          business_name: request.business_name,
          verification_id: verification.id,
        },
      });

      logger.info('Verification submitted successfully', {
        verification_id: verification.id,
      });

      return verification.id.toString();
    } catch (error) {
      logger.error('Failed to submit verification', { error });
      throw error;
    }
  }

  /**
   * Run automated verification checks
   */
  async runAutomatedVerification(verificationId: number): Promise<VerificationResult> {
    logger.info('Running automated verification', { verification_id: verificationId });

    const verification = await prisma.vendorVerification.findUnique({
      where: { id: verificationId },
      include: { documents: true },
    });

    if (!verification) {
      throw new Error('Verification not found');
    }

    const issues: string[] = [];
    const checks: Record<string, boolean> = {
      business_name: false,
      tax_id: false,
      documents_complete: false,
      documents_valid: false,
      business_registered: false,
    };

    // Check 1: Business name validation
    if (verification.business_name && verification.business_name.length >= 3) {
      checks.business_name = true;
    } else {
      issues.push('Business name is too short or missing');
    }

    // Check 2: Tax ID validation
    if (this.validateTaxId(verification.tax_id)) {
      checks.tax_id = true;
    } else {
      issues.push('Invalid tax ID format');
    }

    // Check 3: Required documents
    const requiredDocs = ['business_license', 'tax_id', 'identity_proof'];
    const submittedDocTypes = verification.documents.map(d => d.document_type);

    const hasAllDocs = requiredDocs.every(type => submittedDocTypes.includes(type));
    if (hasAllDocs) {
      checks.documents_complete = true;
    } else {
      const missing = requiredDocs.filter(type => !submittedDocTypes.includes(type));
      issues.push(`Missing documents: ${missing.join(', ')}`);
    }

    // Check 4: Document expiry
    const expiredDocs = verification.documents.filter(
      d => d.expiry_date && d.expiry_date < new Date()
    );

    if (expiredDocs.length === 0) {
      checks.documents_valid = true;
    } else {
      issues.push(`${expiredDocs.length} document(s) expired`);
    }

    // Check 5: Business registration verification (API call)
    if (verification.registration_number) {
      const isRegistered = await this.verifyBusinessRegistration(
        verification.registration_number,
        verification.business_type
      );

      if (isRegistered) {
        checks.business_registered = true;
      } else {
        issues.push('Business registration could not be verified');
      }
    }

    // Calculate verification score
    const passedChecks = Object.values(checks).filter(v => v).length;
    const verificationScore = (passedChecks / Object.keys(checks).length) * 100;

    // Determine status
    let status: 'approved' | 'rejected' | 'pending' | 'requires_info';
    let nextSteps: string[] = [];

    if (verificationScore >= 80 && issues.length === 0) {
      status = 'approved';
      nextSteps.push('Complete KYC verification');
      nextSteps.push('Sign vendor agreement');
    } else if (verificationScore < 40) {
      status = 'rejected';
      nextSteps.push('Resubmit with correct information');
    } else if (issues.length > 0) {
      status = 'requires_info';
      nextSteps = issues.map(issue => `Resolve: ${issue}`);
    } else {
      status = 'pending';
      nextSteps.push('Manual review in progress');
    }

    // Update verification record
    await prisma.vendorVerification.update({
      where: { id: verificationId },
      data: {
        status: status.toUpperCase(),
        verification_score: verificationScore,
        automated_checks: JSON.stringify(checks),
        issues: JSON.stringify(issues),
        last_checked_at: new Date(),
      },
    });

    // Log verification attempt
    await prisma.verificationLog.create({
      data: {
        verification_id: verificationId,
        check_type: 'AUTOMATED',
        result: status.toUpperCase(),
        score: verificationScore,
        details: JSON.stringify({ checks, issues }),
      },
    });

    logger.info('Automated verification completed', {
      verification_id: verificationId,
      status,
      score: verificationScore,
    });

    return {
      status,
      verified_at: status === 'approved' ? new Date() : undefined,
      verification_score: verificationScore,
      issues,
      next_steps: nextSteps,
    };
  }

  /**
   * Manual review by admin
   */
  async manualReview(
    verificationId: number,
    reviewerId: number,
    decision: 'approve' | 'reject',
    notes: string
  ): Promise<void> {
    logger.info('Manual verification review', {
      verification_id: verificationId,
      decision,
    });

    await prisma.vendorVerification.update({
      where: { id: verificationId },
      data: {
        status: decision === 'approve' ? 'APPROVED' : 'REJECTED',
        reviewed_by: reviewerId,
        reviewed_at: new Date(),
        review_notes: notes,
      },
    });

    // Log review
    await prisma.verificationLog.create({
      data: {
        verification_id: verificationId,
        check_type: 'MANUAL',
        result: decision.toUpperCase(),
        reviewer_id: reviewerId,
        details: JSON.stringify({ notes }),
      },
    });

    // Update vendor status
    const verification = await prisma.vendorVerification.findUnique({
      where: { id: verificationId },
      include: { vendor: true },
    });

    if (verification) {
      await prisma.vendor.update({
        where: { id: verification.vendor_id },
        data: {
          verification_status: decision === 'approve' ? 'VERIFIED' : 'REJECTED',
        },
      });

      // Notify vendor
      await sendEmail({
        to: verification.vendor.email,
        subject: `Verification ${decision === 'approve' ? 'Approved' : 'Rejected'}`,
        template: `vendor_verification_${decision}`,
        data: {
          business_name: verification.business_name,
          notes,
        },
      });
    }
  }

  /**
   * Validate tax ID format
   */
  private validateTaxId(taxId: string): boolean {
    // US EIN format: XX-XXXXXXX
    const einPattern = /^\d{2}-\d{7}$/;

    // Indian GST format: XXXXXXXXXXXX
    const gstPattern = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/;

    return einPattern.test(taxId) || gstPattern.test(taxId);
  }

  /**
   * Verify business registration (mock - would call external API)
   */
  private async verifyBusinessRegistration(
    registrationNumber: string,
    businessType: string
  ): Promise<boolean> {
    // Mock verification - in production, call government API
    logger.info('Verifying business registration', {
      registration_number: registrationNumber,
      business_type: businessType,
    });

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock success (80% success rate)
    return Math.random() > 0.2;
  }

  /**
   * Queue automated verification
   */
  private async queueAutomatedVerification(verificationId: number): Promise<void> {
    await redis.lpush(
      'verification:queue',
      JSON.stringify({
        verification_id: verificationId,
        queued_at: Date.now(),
      })
    );
  }

  /**
   * Re-verify vendor (annual review)
   */
  async reVerifyVendor(vendorId: number): Promise<void> {
    logger.info('Re-verifying vendor', { vendor_id: vendorId });

    const verification = await prisma.vendorVerification.findFirst({
      where: {
        vendor_id: vendorId,
        status: 'APPROVED',
      },
      orderBy: { verified_at: 'desc' },
    });

    if (!verification) {
      throw new Error('No approved verification found');
    }

    // Create new verification request
    await prisma.vendorVerification.create({
      data: {
        vendor_id: vendorId,
        business_name: verification.business_name,
        business_type: verification.business_type,
        registration_number: verification.registration_number,
        tax_id: verification.tax_id,
        contact_person: verification.contact_person,
        status: 'PENDING',
        submitted_at: new Date(),
        is_renewal: true,
      },
    });

    await sendEmail({
      to: verification.vendor.email,
      subject: 'Annual Verification Required',
      template: 'vendor_reverification_required',
      data: {
        business_name: verification.business_name,
      },
    });
  }

  /**
   * Get verification status
   */
  async getVerificationStatus(vendorId: number): Promise<any> {
    const verification = await prisma.vendorVerification.findFirst({
      where: { vendor_id: vendorId },
      include: {
        documents: true,
      },
      orderBy: { submitted_at: 'desc' },
    });

    if (!verification) {
      return {
        status: 'not_submitted',
        message: 'No verification submitted',
      };
    }

    return {
      status: verification.status.toLowerCase(),
      verification_score: verification.verification_score,
      submitted_at: verification.submitted_at,
      verified_at: verification.verified_at,
      issues: verification.issues ? JSON.parse(verification.issues) : [],
      documents: verification.documents.map(doc => ({
        type: doc.document_type,
        status: doc.status,
        uploaded_at: doc.created_at,
      })),
    };
  }
}

export default VendorVerification;
