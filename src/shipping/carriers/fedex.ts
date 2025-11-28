/**
 * FedEx Shipping Integration
 * Purpose: Integrate with FedEx Express
 */

import axios from 'axios';
import { logger } from '@/lib/logger';

export class FedExCarrier {
  private apiKey: string;
  private secretKey: string;
  private accountNumber: string;
  private baseUrl = 'https://apis.fedex.com';

  constructor() {
    this.apiKey = process.env.FEDEX_API_KEY || '';
    this.secretKey = process.env.FEDEX_SECRET_KEY || '';
    this.accountNumber = process.env.FEDEX_ACCOUNT_NUMBER || '';
  }

  async authenticate(): Promise<string> {
    const response = await axios.post(`${this.baseUrl}/oauth/token`, {
      grant_type: 'client_credentials',
      client_id: this.apiKey,
      client_secret: this.secretKey,
    });

    return response.data.access_token;
  }

  async getRates(request: any): Promise<any[]> {
    logger.info('Getting FedEx rates', { request });

    const token = await this.authenticate();

    const payload = {
      accountNumber: {
        value: this.accountNumber,
      },
      requestedShipment: {
        shipper: {
          address: {
            postalCode: request.origin.postalCode,
            countryCode: request.origin.country,
          },
        },
        recipient: {
          address: {
            postalCode: request.destination.postalCode,
            countryCode: request.destination.country,
          },
        },
        requestedPackageLineItems: request.packages.map((p: any) => ({
          weight: {
            value: p.weight,
            units: 'KG',
          },
          dimensions: {
            length: p.length,
            width: p.width,
            height: p.height,
            units: 'CM',
          },
        })),
      },
    };

    const response = await axios.post(`${this.baseUrl}/rate/v1/rates/quotes`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return response.data.output.rateReplyDetails.map((rate: any) => ({
      carrier: 'fedex',
      service: rate.serviceName,
      rate: rate.ratedShipmentDetails[0].totalNetCharge,
      currency: rate.ratedShipmentDetails[0].currency,
      estimatedDays: rate.commit?.transitDays || 5,
    }));
  }

  async createShipment(request: any): Promise<any> {
    logger.info('Creating FedEx shipment', { request });

    const token = await this.authenticate();

    const payload = {
      requestedShipment: {
        shipper: {
          contact: {
            personName: request.origin.name,
            phoneNumber: request.origin.phone,
          },
          address: {
            streetLines: [request.origin.address],
            city: request.origin.city,
            stateOrProvinceCode: request.origin.state,
            postalCode: request.origin.postalCode,
            countryCode: request.origin.country,
          },
        },
        recipients: [
          {
            contact: {
              personName: request.destination.name,
              phoneNumber: request.destination.phone,
            },
            address: {
              streetLines: [request.destination.address],
              city: request.destination.city,
              stateOrProvinceCode: request.destination.state,
              postalCode: request.destination.postalCode,
              countryCode: request.destination.country,
            },
          },
        ],
        serviceType: 'FEDEX_INTERNATIONAL_PRIORITY',
        packagingType: 'YOUR_PACKAGING',
        requestedPackageLineItems: request.packages.map((p: any) => ({
          weight: {
            value: p.weight,
            units: 'KG',
          },
        })),
      },
      labelSpecification: {
        labelFormatType: 'COMMON2D',
        imageType: 'PDF',
      },
    };

    const response = await axios.post(`${this.baseUrl}/ship/v1/shipments`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return {
      trackingNumber: response.data.output.transactionShipments[0].masterTrackingNumber,
      labelUrl: response.data.output.transactionShipments[0].pieceResponses[0].packageDocuments[0].url,
    };
  }

  async trackShipment(trackingNumber: string): Promise<any> {
    logger.info('Tracking FedEx shipment', { trackingNumber });

    const token = await this.authenticate();

    const response = await axios.post(
      `${this.baseUrl}/track/v1/trackingnumbers`,
      {
        trackingInfo: [
          {
            trackingNumberInfo: {
              trackingNumber,
            },
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  }
}

export default FedExCarrier;
