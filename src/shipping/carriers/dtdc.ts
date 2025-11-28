/**
 * DTDC Shipping Integration
 * Purpose: Integrate with DTDC courier (India)
 */

import axios from 'axios';
import { logger } from '@/lib/logger';

export class DTDCCarrier {
  private apiKey: string;
  private customerId: string;
  private baseUrl = 'https://blktrackapiuat.dtdc.com/dtdc-api';

  constructor() {
    this.apiKey = process.env.DTDC_API_KEY || '';
    this.customerId = process.env.DTDC_CUSTOMER_ID || '';
  }

  async getRates(request: any): Promise<any[]> {
    logger.info('Getting DTDC rates', { request });

    return [
      {
        carrier: 'dtdc',
        service: 'Express',
        rate: 100,
        currency: 'INR',
        estimatedDays: 3,
      },
    ];
  }

  async createShipment(request: any): Promise<any> {
    logger.info('Creating DTDC shipment', { request });

    const payload = {
      customer_code: this.customerId,
      service_type_id: 'B2C SMART EXPRESS',
      load_type: 'NON-DOCUMENT',
      description: 'Product',
      dimension: [
        {
          length: request.packages[0].length,
          width: request.packages[0].width,
          height: request.packages[0].height,
        },
      ],
      pieces: request.packages.length,
      declared_value: 1000,
      cod_amount: 0,
      consignee: {
        name: request.destination.name,
        address: request.destination.address,
        city: request.destination.city,
        state: request.destination.state,
        pincode: request.destination.postalCode,
        phone: request.destination.phone,
      },
    };

    const response = await axios.post(`${this.baseUrl}/shipment/create`, payload, {
      headers: {
        'api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
    });

    return {
      trackingNumber: response.data.awb_number || '',
      labelUrl: response.data.label_url || '',
    };
  }

  async trackShipment(trackingNumber: string): Promise<any> {
    logger.info('Tracking DTDC shipment', { trackingNumber });

    const response = await axios.get(`${this.baseUrl}/shipment/track`, {
      params: { awb_number: trackingNumber },
      headers: { 'api-key': this.apiKey },
    });

    return response.data;
  }
}

export default DTDCCarrier;
