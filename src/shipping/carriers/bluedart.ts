/**
 * Blue Dart Shipping Integration
 * Purpose: Integrate with Blue Dart courier (India)
 */

import axios from 'axios';
import { logger } from '@/lib/logger';

export class BlueDartCarrier {
  private licenseKey: string;
  private loginId: string;
  private baseUrl: string;

  constructor() {
    this.licenseKey = process.env.BLUEDART_LICENSE_KEY || '';
    this.loginId = process.env.BLUEDART_LOGIN_ID || '';
    this.baseUrl = 'https://api.bluedart.com/servlet';
  }

  async getRates(request: any): Promise<any[]> {
    logger.info('Getting Blue Dart rates', { request });

    try {
      const response = await axios.post(`${this.baseUrl}/RoutingServlet`, {
        Request: {
          ServiceType: 'C',
          AccountType: 'D',
          CommodityCode: 'CC0001',
          OriginPincode: request.origin.postalCode,
          DestinationPincode: request.destination.postalCode,
          Weight: request.packages.reduce((sum: number, p: any) => sum + p.weight, 0),
          Dimensions: request.packages.map((p: any) => ({
            Length: p.length,
            Width: p.width,
            Height: p.height,
          })),
        },
        Profile: {
          Api_type: 'S',
          LicenceKey: this.licenseKey,
          LoginID: this.loginId,
        },
      });

      return [
        {
          carrier: 'bluedart',
          service: 'Express',
          rate: parseFloat(response.data.RoutingResponse?.Charges || '0'),
          currency: 'INR',
          estimatedDays: 2,
        },
      ];
    } catch (error) {
      logger.error('Blue Dart rate calculation failed', { error });
      throw new Error('Failed to get Blue Dart rates');
    }
  }

  async createShipment(request: any): Promise<any> {
    logger.info('Creating Blue Dart shipment', { request });

    const response = await axios.post(`${this.baseUrl}/BookingServlet`, {
      Request: {
        Consignee: {
          ConsigneeName: request.destination.name,
          ConsigneeAddress1: request.destination.address,
          ConsigneeCity: request.destination.city,
          ConsigneePincode: request.destination.postalCode,
          ConsigneePhone: request.destination.phone,
        },
        Services: {
          AWBNo: '',
          ProductCode: 'D',
          ServiceType: 'C',
        },
        Shipment: {
          Weight: request.packages.reduce((sum: number, p: any) => sum + p.weight, 0),
          Pieces: request.packages.length,
        },
      },
      Profile: {
        Api_type: 'S',
        LicenceKey: this.licenseKey,
        LoginID: this.loginId,
      },
    });

    return {
      trackingNumber: response.data.BookingResponse?.AWBNo || '',
      labelUrl: response.data.BookingResponse?.LabelURL || '',
    };
  }

  async trackShipment(trackingNumber: string): Promise<any> {
    logger.info('Tracking Blue Dart shipment', { trackingNumber });

    const response = await axios.post(`${this.baseUrl}/TrackingServlet`, {
      Request: {
        AWBNo: trackingNumber,
      },
      Profile: {
        Api_type: 'S',
        LicenceKey: this.licenseKey,
        LoginID: this.loginId,
      },
    });

    return response.data;
  }
}

export default BlueDartCarrier;
