/**
 * Delhivery Shipping Integration
 * Purpose: Integrate with Delhivery courier (India)
 */

import axios from 'axios';
import { logger } from '@/lib/logger';

export class DelhiveryCarrier {
  private apiKey: string;
  private baseUrl = 'https://track.delhivery.com/api';

  constructor() {
    this.apiKey = process.env.DELHIVERY_API_KEY || '';
  }

  async getRates(request: any): Promise<any[]> {
    logger.info('Getting Delhivery rates', { request });

    try {
      const params = new URLSearchParams({
        md: 'S',
        ss: 'Delivered',
        d_pin: request.destination.postalCode,
        o_pin: request.origin.postalCode,
        cgm: request.packages.reduce((sum: number, p: any) => sum + p.weight, 0).toString(),
        pt: 'Pre-paid',
      });

      const response = await axios.get(
        `${this.baseUrl}/kinko/v1/invoice/charges/.json?${params}`,
        {
          headers: {
            Authorization: `Token ${this.apiKey}`,
          },
        }
      );

      return [
        {
          carrier: 'delhivery',
          service: 'Surface',
          rate: response.data[0]?.total_amount || 0,
          currency: 'INR',
          estimatedDays: 5,
        },
      ];
    } catch (error) {
      logger.error('Delhivery rate calculation failed', { error });
      throw new Error('Failed to get Delhivery rates');
    }
  }

  async createShipment(request: any): Promise<any> {
    logger.info('Creating Delhivery shipment', { request });

    const shipmentData = {
      shipments: [
        {
          name: request.destination.name,
          add: request.destination.address,
          pin: request.destination.postalCode,
          city: request.destination.city,
          state: request.destination.state,
          country: request.destination.country,
          phone: request.destination.phone,
          order: `ORD${Date.now()}`,
          payment_mode: 'Prepaid',
          return_pin: request.origin.postalCode,
          return_city: request.origin.city,
          return_phone: request.origin.phone,
          return_add: request.origin.address,
          return_state: request.origin.state,
          return_country: request.origin.country,
          products_desc: 'Product',
          hsn_code: '',
          cod_amount: '',
          order_date: new Date().toISOString(),
          total_amount: 1000,
          seller_add: request.origin.address,
          seller_name: request.origin.name,
          seller_inv: '',
          quantity: request.packages.length,
          waybill: '',
          shipment_width: request.packages[0].width,
          shipment_height: request.packages[0].height,
          weight: request.packages.reduce((sum: number, p: any) => sum + p.weight, 0),
          seller_gst_tin: '',
          shipping_mode: 'Surface',
          address_type: 'home',
        },
      ],
      pickup_location: {
        name: request.origin.name,
      },
    };

    const response = await axios.post(
      `${this.baseUrl}/cmu/create.json`,
      `format=json&data=${JSON.stringify(shipmentData)}`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${this.apiKey}`,
        },
      }
    );

    return {
      trackingNumber: response.data.packages[0]?.waybill || '',
      labelUrl: '',
    };
  }

  async trackShipment(trackingNumber: string): Promise<any> {
    logger.info('Tracking Delhivery shipment', { trackingNumber });

    const response = await axios.get(`${this.baseUrl}/v1/packages/json/`, {
      params: { waybill: trackingNumber },
      headers: {
        Authorization: `Token ${this.apiKey}`,
      },
    });

    return response.data;
  }
}

export default DelhiveryCarrier;
