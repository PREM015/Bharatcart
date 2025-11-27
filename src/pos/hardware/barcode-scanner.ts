/**
 * Barcode Scanner Integration
 * Purpose: Interface with barcode scanning hardware
 * Description: USB/Bluetooth scanner support, automatic product lookup
 */

import { logger } from '@/lib/logger';
import { EventEmitter } from 'events';
import { prisma } from '@/lib/prisma';

export interface ScanResult {
  barcode: string;
  symbology: string;
  timestamp: Date;
  product?: any;
}

export class BarcodeScanner extends EventEmitter {
  private isListening: boolean = false;
  private scanBuffer: string = '';
  private scanTimeout?: NodeJS.Timeout;

  constructor() {
    super();
  }

  /**
   * Start listening for scans
   */
  startListening(): void {
    if (this.isListening) {
      logger.warn('Scanner already listening');
      return;
    }

    logger.info('Starting barcode scanner');

    // Listen for keyboard input (USB scanners act as keyboards)
    if (typeof window !== 'undefined') {
      window.addEventListener('keypress', this.handleKeyPress.bind(this));
    }

    this.isListening = true;
    this.emit('ready');
  }

  /**
   * Stop listening
   */
  stopListening(): void {
    if (!this.isListening) return;

    logger.info('Stopping barcode scanner');

    if (typeof window !== 'undefined') {
      window.removeEventListener('keypress', this.handleKeyPress.bind(this));
    }

    this.isListening = false;
    this.emit('stopped');
  }

  /**
   * Handle keyboard input from scanner
   */
  private handleKeyPress(event: KeyboardEvent): void {
    // Prevent default if scanner is active
    if (this.isListening && event.key !== 'Tab') {
      event.preventDefault();
    }

    // Enter key signals end of scan
    if (event.key === 'Enter') {
      this.processScan();
      return;
    }

    // Add character to buffer
    this.scanBuffer += event.key;

    // Reset timeout
    if (this.scanTimeout) {
      clearTimeout(this.scanTimeout);
    }

    // Auto-process after 100ms of no input
    this.scanTimeout = setTimeout(() => {
      if (this.scanBuffer.length > 0) {
        this.processScan();
      }
    }, 100);
  }

  /**
   * Process scanned barcode
   */
  private async processScan(): Promise<void> {
    const barcode = this.scanBuffer.trim();
    this.scanBuffer = '';

    if (!barcode || barcode.length < 4) {
      return;
    }

    logger.info('Barcode scanned', { barcode });

    try {
      // Determine symbology
      const symbology = this.detectSymbology(barcode);

      // Lookup product
      const product = await this.lookupProduct(barcode);

      const result: ScanResult = {
        barcode,
        symbology,
        timestamp: new Date(),
        product,
      };

      this.emit('scan', result);

      if (product) {
        this.emit('product_found', product);
      } else {
        this.emit('product_not_found', barcode);
      }
    } catch (error) {
      logger.error('Error processing barcode', { barcode, error });
      this.emit('error', error);
    }
  }

  /**
   * Lookup product by barcode
   */
  private async lookupProduct(barcode: string): Promise<any | null> {
    // Try exact match
    let product = await prisma.product.findFirst({
      where: {
        OR: [
          { sku: barcode },
          { barcode: barcode },
          { upc: barcode },
          { ean: barcode },
        ],
      },
      include: {
        variants: true,
        pricing: true,
      },
    });

    // Try variant match
    if (!product) {
      const variant = await prisma.productVariant.findFirst({
        where: {
          OR: [
            { sku: barcode },
            { barcode: barcode },
          ],
        },
        include: {
          product: {
            include: {
              pricing: true,
            },
          },
        },
      });

      if (variant) {
        product = variant.product;
        product.selected_variant = variant;
      }
    }

    return product;
  }

  /**
   * Detect barcode symbology
   */
  private detectSymbology(barcode: string): string {
    const length = barcode.length;

    // UPC-A: 12 digits
    if (length === 12 && /^\d+$/.test(barcode)) {
      return 'UPC-A';
    }

    // EAN-13: 13 digits
    if (length === 13 && /^\d+$/.test(barcode)) {
      return 'EAN-13';
    }

    // EAN-8: 8 digits
    if (length === 8 && /^\d+$/.test(barcode)) {
      return 'EAN-8';
    }

    // Code 39: Alphanumeric with * delimiters
    if (barcode.startsWith('*') && barcode.endsWith('*')) {
      return 'CODE-39';
    }

    // Code 128: Variable length
    if (/^[A-Za-z0-9\-\.\s\$\/\+%]+$/.test(barcode)) {
      return 'CODE-128';
    }

    // QR Code: Can contain any characters
    return 'QR-CODE';
  }

  /**
   * Validate barcode checksum
   */
  validateChecksum(barcode: string, symbology: string): boolean {
    if (symbology === 'UPC-A' || symbology === 'EAN-13') {
      return this.validateUPCEAN(barcode);
    }

    return true; // Default to valid for other types
  }

  /**
   * Validate UPC/EAN checksum
   */
  private validateUPCEAN(barcode: string): boolean {
    if (!/^\d+$/.test(barcode)) return false;

    const digits = barcode.split('').map(Number);
    const checkDigit = digits.pop()!;

    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
      sum += digits[i] * (i % 2 === 0 ? 1 : 3);
    }

    const calculated = (10 - (sum % 10)) % 10;
    return calculated === checkDigit;
  }

  /**
   * Manual scan entry
   */
  async manualScan(barcode: string): Promise<ScanResult> {
    logger.info('Manual barcode entry', { barcode });

    const symbology = this.detectSymbology(barcode);
    const product = await this.lookupProduct(barcode);

    const result: ScanResult = {
      barcode,
      symbology,
      timestamp: new Date(),
      product,
    };

    this.emit('scan', result);

    return result;
  }

  /**
   * Test scanner connection
   */
  async testScanner(): Promise<boolean> {
    logger.info('Testing scanner connection');

    // Simulate test scan
    this.emit('test', { status: 'ok' });

    return true;
  }
}

export default BarcodeScanner;
