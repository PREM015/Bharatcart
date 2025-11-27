# Building Custom Integrations

**Purpose**: Guide for creating custom payment, shipping, or API integrations  
**Level**: Intermediate

## Payment Gateway Integration

### Step 1: Create Payment Provider

```typescript
// src/integrations/payments/custom-gateway.ts

/**
 * Custom Payment Gateway Integration
 * Purpose: Integrates with XYZ Payment Provider
 */

import { PaymentProvider, PaymentResult } from '@/types/payment';

export class CustomPaymentGateway implements PaymentProvider {
  private apiKey: string;
  private apiUrl: string;

  constructor(config: { apiKey: string; apiUrl: string }) {
    this.apiKey = config.apiKey;
    this.apiUrl = config.apiUrl;
  }

  async createPayment(params: {
    amount: number;
    currency: string;
    orderId: string;
  }): Promise<PaymentResult> {
    const response = await fetch(`${this.apiUrl}/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: params.amount,
        currency: params.currency,
        reference: params.orderId,
      }),
    });

    const data = await response.json();

    return {
      transactionId: data.id,
      status: data.status,
      paymentUrl: data.payment_url,
    };
  }

  async verifyPayment(transactionId: string): Promise<boolean> {
    const response = await fetch(`${this.apiUrl}/payments/${transactionId}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    const data = await response.json();
    return data.status === 'completed';
  }

  async refundPayment(transactionId: string, amount: number): Promise<void> {
    await fetch(`${this.apiUrl}/payments/${transactionId}/refund`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount }),
    });
  }
}
```

### Step 2: Register Provider

```typescript
// src/lib/payments/index.ts

import { CustomPaymentGateway } from '@/integrations/payments/custom-gateway';

export const paymentProviders = {
  stripe: new StripeGateway({ apiKey: process.env.STRIPE_SECRET_KEY }),
  custom: new CustomPaymentGateway({
    apiKey: process.env.CUSTOM_GATEWAY_API_KEY,
    apiUrl: process.env.CUSTOM_GATEWAY_URL,
  }),
};
```

### Step 3: Create API Route

```typescript
// src/app/api/payments/custom/route.ts

import { NextResponse } from 'next/server';
import { paymentProviders } from '@/lib/payments';

export async function POST(request: Request) {
  const { amount, currency, orderId } = await request.json();

  try {
    const result = await paymentProviders.custom.createPayment({
      amount,
      currency,
      orderId,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: 'Payment failed' },
      { status: 500 }
    );
  }
}
```

## Shipping Provider Integration

### Step 1: Create Shipping Provider

```typescript
// src/integrations/shipping/custom-shipper.ts

/**
 * Custom Shipping Provider
 * Purpose: Integrates with XYZ Logistics
 */

import { ShippingProvider, ShippingRate } from '@/types/shipping';

export class CustomShipper implements ShippingProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getRates(params: {
    origin: Address;
    destination: Address;
    weight: number;
  }): Promise<ShippingRate[]> {
    const response = await fetch('https://api.customshipper.com/rates', {
      method: 'POST',
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: params.origin,
        to: params.destination,
        weight: params.weight,
      }),
    });

    const data = await response.json();

    return data.rates.map((rate: any) => ({
      service: rate.service_name,
      cost: rate.total_cost,
      estimatedDays: rate.delivery_days,
      carrier: 'CustomShipper',
    }));
  }

  async createShipment(params: {
    orderId: string;
    rate: ShippingRate;
  }): Promise<{ trackingNumber: string; label: string }> {
    const response = await fetch('https://api.customshipper.com/shipments', {
      method: 'POST',
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reference: params.orderId,
        service: params.rate.service,
      }),
    });

    const data = await response.json();

    return {
      trackingNumber: data.tracking_number,
      label: data.label_url,
    };
  }

  async trackShipment(trackingNumber: string): Promise<TrackingInfo> {
    const response = await fetch(
      `https://api.customshipper.com/track/${trackingNumber}`,
      {
        headers: {
          'X-API-Key': this.apiKey,
        },
      }
    );

    const data = await response.json();

    return {
      status: data.status,
      location: data.current_location,
      estimatedDelivery: new Date(data.estimated_delivery),
      events: data.tracking_events,
    };
  }
}
```

## Third-Party API Integration

### Step 1: Create Service

```typescript
// src/services/integrations/analytics-service.ts

/**
 * Analytics Service Integration
 * Purpose: Integrates with external analytics platform
 */

export class AnalyticsService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.ANALYTICS_API_URL;
    this.apiKey = process.env.ANALYTICS_API_KEY;
  }

  async trackEvent(event: {
    name: string;
    userId?: string;
    properties?: Record<string, any>;
  }) {
    await fetch(`${this.baseUrl}/events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event: event.name,
        user_id: event.userId,
        properties: event.properties,
        timestamp: new Date().toISOString(),
      }),
    });
  }

  async trackPageView(params: {
    userId?: string;
    page: string;
    referrer?: string;
  }) {
    await this.trackEvent({
      name: 'page_view',
      userId: params.userId,
      properties: {
        page: params.page,
        referrer: params.referrer,
      },
    });
  }
}
```

### Step 2: Use in Components

```typescript
// src/app/products/[id]/page.tsx

import { AnalyticsService } from '@/services/integrations/analytics-service';

export default async function ProductPage({ params }: { params: { id: string } }) {
  const analytics = new AnalyticsService();
  
  // Track page view
  await analytics.trackPageView({
    page: `/products/${params.id}`,
  });

  // ... rest of component
}
```

## Webhook Integration

### Step 1: Create Webhook Handler

```typescript
// src/app/api/webhooks/custom/route.ts

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import crypto from 'crypto';

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = headers();
  const signature = headersList.get('x-custom-signature');

  // Verify webhook signature
  const expectedSignature = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  if (signature !== expectedSignature) {
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 401 }
    );
  }

  const event = JSON.parse(body);

  // Handle different event types
  switch (event.type) {
    case 'payment.success':
      await handlePaymentSuccess(event.data);
      break;
    case 'payment.failed':
      await handlePaymentFailed(event.data);
      break;
    default:
      console.log('Unknown event type:', event.type);
  }

  return NextResponse.json({ received: true });
}

async function handlePaymentSuccess(data: any) {
  // Update order status
  await prisma.order.update({
    where: { id: data.order_id },
    data: { status: 'paid' },
  });
}

async function handlePaymentFailed(data: any) {
  // Handle failed payment
  await prisma.order.update({
    where: { id: data.order_id },
    data: { status: 'payment_failed' },
  });
}
```

## Testing Integrations

### Unit Tests

```typescript
// src/integrations/__tests__/custom-gateway.test.ts

import { CustomPaymentGateway } from '../payments/custom-gateway';

describe('CustomPaymentGateway', () => {
  it('should create payment', async () => {
    const gateway = new CustomPaymentGateway({
      apiKey: 'test_key',
      apiUrl: 'https://test.api.com',
    });

    const result = await gateway.createPayment({
      amount: 1000,
      currency: 'USD',
      orderId: 'order_123',
    });

    expect(result.transactionId).toBeDefined();
    expect(result.status).toBe('pending');
  });
});
```

## Best Practices

1. **Error Handling**: Always wrap API calls in try-catch
2. **Retry Logic**: Implement exponential backoff for failed requests
3. **Logging**: Log all integration events
4. **Secrets**: Store API keys in environment variables
5. **Testing**: Mock external APIs in tests
6. **Documentation**: Document API endpoints and expected responses
