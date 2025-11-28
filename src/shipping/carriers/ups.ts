/**
 * UPS Shipping Integration
 * Purpose: Integrate with UPS
 */

import axios from 'axios';
import { logger } from '@/lib/logger';

export class UPSCarrier {
  private accessKey: string;
  private username: string;
  private password: string;
  private baseUrl = 'https://onlinetools.ups.com/api';

  constructor() {
    this.accessKey = process.env.UPS_ACCESS_KEY || '';
    this.username = process.env.UPS_USERNAME || '';
    this.password = process.env.UPS_PASSWORD || '';
  }

  async getRates(request: any): Promise<any[]> {
    logger.info('Getting UPS rates', { request });

    const payload = {
      RateRequest: {
        Shipment: {
          Shipper: {
            Address: {
              PostalCode: request.origin.postalCode,
              CountryCode: request.origin.country,
            },
          },
          ShipTo: {
            Address: {
              PostalCode: request.destination.postalCode,
              CountryCode: request.destination.country,
            },
          },
          Package: request.packages.map((p: any) => ({
            PackagingType: {
              Code: '02',
            },
            PackageWeight: {
              Weight: p.weight.toString(),
            },
          })),
        },
      },
    };

    const response = await axios.post(`${this.baseUrl}/rating/v1/Rate`, payload, {
      headers: {
        AccessLicenseNumber: this.accessKey,
        Username: this.username,
        Password: this.password,
        'Content-Type': 'application/json',
      },
    });

    return response.data.RateResponse.RatedShipment.map((rate: any) => ({
      carrier: 'ups',
      service: rate.Service.Code,
      rate: parseFloat(rate.TotalCharges.MonetaryValue),
      currency: rate.TotalCharges.CurrencyCode,
      estimatedDays: 5,
    }));
  }

  async trackShipment(trackingNumber: string): Promise<any> {
    logger.info('Tracking UPS shipment', { trackingNumber });

    const response = await axios.get(`${this.baseUrl}/track/v1/details/${trackingNumber}`, {
      headers: {
        AccessLicenseNumber: this.accessKey,
        Username: this.username,
        Password: this.password,
      },
    });

    return response.data;
  }
}

export default UPSCarrier;
