/**
 * Route Optimizer
 * Purpose: Optimize delivery routes for efficiency
 */

import { logger } from '@/lib/logger';

export interface DeliveryStop {
  address: string;
  latitude: number;
  longitude: number;
  priority: number;
}

export class RouteOptimizer {
  optimize(stops: DeliveryStop[]): DeliveryStop[] {
    logger.info('Optimizing route', { stopCount: stops.length });

    // Simple nearest neighbor algorithm
    if (stops.length === 0) return [];

    const optimized: DeliveryStop[] = [];
    const remaining = [...stops];
    let current = remaining.shift()!;
    optimized.push(current);

    while (remaining.length > 0) {
      let nearest = remaining[0];
      let minDistance = this.calculateDistance(current, nearest);

      for (const stop of remaining) {
        const distance = this.calculateDistance(current, stop);
        if (distance < minDistance) {
          minDistance = distance;
          nearest = stop;
        }
      }

      optimized.push(nearest);
      remaining.splice(remaining.indexOf(nearest), 1);
      current = nearest;
    }

    return optimized;
  }

  private calculateDistance(a: DeliveryStop, b: DeliveryStop): number {
    // Haversine formula
    const R = 6371; // Earth radius in km
    const dLat = this.toRad(b.latitude - a.latitude);
    const dLon = this.toRad(b.longitude - a.longitude);

    const lat1 = this.toRad(a.latitude);
    const lat2 = this.toRad(b.latitude);

    const x =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);

    const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

export default RouteOptimizer;
