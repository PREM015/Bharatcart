/**
 * Aramex Shipping Integration
 * Purpose: Integrate with Aramex courier service
 * Description: Rate calculation, label generation, tracking for Aramex
 * 
 * Features:
 * - Rate calculation
 * - Shipment creation
 * - Label generation
 * - Tracking
 * - Pickup scheduling
 * - International shipping
 * 
 * @example
 * ```typescript
 * const aramex = new AramexCarrier();
 * const rate = await aramex.getRates({
 *   origin: { city: 'Dubai', country: 'AE' },
 *   destination: { city: 'Mumbai', country: 'IN' },
 *   weight: 2.5
 * });
 * ```
 */

import axios from 'axios';
import { logger } from '@/lib/logger';

export interface ShipmentRequest {
  origin: {
    name: string;
    address: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
    phone: string;
  };
  destination: {
    name: string;
    address: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
    phone: string;
  };
  packages: Array<{
    weight: number;
    length: number;
    width: number;
    height: number;
  }>;
  serviceType?: string;
}

export interface RateResponse {
  carrier: string;
  service: string;
  rate: number;
  currency: string;
  estimatedDays: number;
}

export class AramexCarrier {
  private username: string;
  private password: string;
  private accountNumber: string;
  private baseUrl: string;

  constructor() {
    this.username = process.env.ARAMEX_USERNAME || '';
    this.password = process.env.ARAMEX_PASSWORD || '';
    this.accountNumber = process.env.ARAMEX_ACCOUNT_NUMBER || '';
    this.baseUrl = process.env.ARAMEX_API_URL || 'https://ws.aramex.net/ShippingAPI.V2';
  }

  /**
   * Get shipping rates
   */
  async getRates(request: ShipmentRequest): Promise<RateResponse[]> {
    logger.info('Getting Aramex rates', { request });

    try {
      const payload = {
        ClientInfo: {
          UserName: this.username,
          Password: this.password,
          AccountNumber: this.accountNumber,
          AccountEntity: 'DXB',
        },
        Transaction: {
          Reference1: `RATE-${Date.now()}`,
        },
        OriginAddress: {
          City: request.origin.city,
          CountryCode: request.origin.country,
        },
        DestinationAddress: {
          City: request.destination.city,
          CountryCode: request.destination.country,
        },
        ShipmentDetails: {
          NumberOfPieces: request.packages.length,
          ActualWeight: {
            Value: request.packages.reduce((sum, p) => sum + p.weight, 0),
            Unit: 'KG',
          },
        },
      };

      const response = await axios.post(
        `${this.baseUrl}/Service_1_0.svc/json/CalculateRate`,
        payload
      );

      const result = response.data;

      if (result.HasErrors) {
        throw new Error(result.Notifications[0]?.Message || 'Rate calculation failed');
      }

      return [
        {
          carrier: 'aramex',
          service: 'Express',
          rate: result.TotalAmount?.Value || 0,
          currency: result.TotalAmount?.CurrencyCode || 'USD',
          estimatedDays: 3,
        },
      ];
    } catch (error) {
      logger.error('Aramex rate calculation failed', { error });
      throw new Error('Failed to get Aramex rates');
    }
  }

  /**
   * Create shipment
   */
  async createShipment(request: ShipmentRequest): Promise<{
    trackingNumber: string;
    labelUrl: string;
  }> {
    logger.info('Creating Aramex shipment', { request });

    try {
      const payload = {
        ClientInfo: {
          UserName: this.username,
          Password: this.password,
          AccountNumber: this.accountNumber,
        },
        Shipments: [
          {
            Shipper: {
              PartyAddress: {
                Line1: request.origin.address,
                City: request.origin.city,
                StateOrProvinceCode: request.origin.state,
                PostCode: request.origin.postalCode,
                CountryCode: request.origin.country,
              },
              Contact: {
                PersonName: request.origin.name,
                PhoneNumber1: request.origin.phone,
              },
            },
            Consignee: {
              PartyAddress: {
                Line1: request.destination.address,
                City: request.destination.city,
                StateOrProvinceCode: request.destination.state,
                PostCode: request.destination.postalCode,
                CountryCode: request.destination.country,
              },
              Contact: {
                PersonName: request.destination.name,
                PhoneNumber1: request.destination.phone,
              },
            },
            Details: {
              NumberOfPieces: request.packages.length,
              ActualWeight: {
                Value: request.packages.reduce((sum, p) => sum + p.weight, 0),
                Unit: 'KG',
              },
              ProductGroup: 'EXP',
              ProductType: 'PPX',
              PaymentType: 'P',
              Services: 'CODS',
            },
          },
        ],
        LabelInfo: {
          ReportID: 9729,
          ReportType: 'URL',
        },
      };

      const response = await axios.post(
        `${this.baseUrl}/Service_1_0.svc/json/CreateShipments`,
        payload
      );

      const result = response.data;

      if (result.HasErrors) {
        throw new Error(result.Notifications[0]?.Message || 'Shipment creation failed');
      }

      const shipment = result.Shipments[0];

      return {
        trackingNumber: shipment.ID,
        labelUrl: shipment.ShipmentLabel.LabelURL,
      };
    } catch (error) {
      logger.error('Aramex shipment creation failed', { error });
      throw new Error('Failed to create Aramex shipment');
    }
  }

  /**
   * Track shipment
   */
  async trackShipment(trackingNumber: string): Promise<any> {
    logger.info('Tracking Aramex shipment', { trackingNumber });

    try {
      const payload = {
        ClientInfo: {
          UserName: this.username,
          Password: this.password,
          AccountNumber: this.accountNumber,
        },
        Transaction: {
          Reference1: trackingNumber,
        },
        Shipments: [trackingNumber],
      };

      const response = await axios.post(
        `${this.baseUrl}/Service_1_0.svc/json/TrackShipments`,
        payload
      );

      return response.data;
    } catch (error) {
      logger.error('Aramex tracking failed', { error });
      throw new Error('Failed to track Aramex shipment');
    }
  }

  /**
   * Schedule pickup
   */
  async schedulePickup(
    date: Date,
    location: ShipmentRequest['origin']
  ): Promise<{ pickupId: string }> {
    logger.info('Scheduling Aramex pickup', { date, location });

    try {
      const payload = {
        ClientInfo: {
          UserName: this.username,
          Password: this.password,
          AccountNumber: this.accountNumber,
        },
        Pickup: {
          PickupAddress: {
            Line1: location.address,
            City: location.city,
            CountryCode: location.country,
          },
          PickupContact: {
            PersonName: location.name,
            PhoneNumber1: location.phone,
          },
          PickupDate: date.toISOString().split('T')[0],
          ReadyTime: '09:00',
          ClosingTime: '17:00',
        },
      };

      const response = await axios.post(
        `${this.baseUrl}/Service_1_0.svc/json/CreatePickup`,
        payload
      );

      return {
        pickupId: response.data.ProcessedPickup?.ID || '',
      };
    } catch (error) {
      logger.error('Aramex pickup scheduling failed', { error });
      throw new Error('Failed to schedule Aramex pickup');
    }
  }
}

export default AramexCarrier;
