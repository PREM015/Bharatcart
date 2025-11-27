# Webhooks Reference

**Purpose**: Receive real-time notifications for events  
**Format**: HTTP POST with JSON payload

## Setup

1. Navigate to Dashboard → Settings → Webhooks
2. Click "Add Webhook"
3. Enter your endpoint URL
4. Select events to subscribe
5. Save and copy the signing secret

## Security

### Signature Verification

All webhook requests include `X-Webhook-Signature` header:

```typescript
import crypto from 'crypto';

function verifyWebhook(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

---

## Events

### order.created
Triggered when a new order is created.

**Payload:**
```json
{
  "event": "order.created",
  "timestamp": "2024-01-01T00:00:00Z",
  "data": {
    "orderId": "ORD-2024-00001",
    "userId": "123",
    "total": 235997,
    "status": "pending",
    "items": [
      {
        "productId": "1",
        "name": "iPhone 15 Pro",
        "quantity": 2,
        "price": 99999
      }
    ]
  }
}
```

---

### order.paid
Triggered when payment is successful.

**Payload:**
```json
{
  "event": "order.paid",
  "timestamp": "2024-01-01T00:05:00Z",
  "data": {
    "orderId": "ORD-2024-00001",
    "paymentId": "txn_123",
    "amount": 235997,
    "currency": "INR",
    "paymentMethod": "stripe"
  }
}
```

---

### order.shipped
Triggered when order is shipped.

**Payload:**
```json
{
  "event": "order.shipped",
  "timestamp": "2024-01-02T10:00:00Z",
  "data": {
    "orderId": "ORD-2024-00001",
    "tracking": {
      "carrier": "BlueDart",
      "trackingNumber": "BD123456789",
      "estimatedDelivery": "2024-01-05T00:00:00Z"
    }
  }
}
```

---

### order.delivered
Triggered when order is delivered.

**Payload:**
```json
{
  "event": "order.delivered",
  "timestamp": "2024-01-05T14:30:00Z",
  "data": {
    "orderId": "ORD-2024-00001",
    "deliveredAt": "2024-01-05T14:30:00Z"
  }
}
```

---

### order.cancelled
Triggered when order is cancelled.

**Payload:**
```json
{
  "event": "order.cancelled",
  "timestamp": "2024-01-01T12:00:00Z",
  "data": {
    "orderId": "ORD-2024-00001",
    "reason": "Customer request",
    "refundStatus": "pending"
  }
}
```

---

### product.created
Triggered when new product is added.

**Payload:**
```json
{
  "event": "product.created",
  "timestamp": "2024-01-01T00:00:00Z",
  "data": {
    "productId": "1",
    "name": "iPhone 15 Pro",
    "price": 99999,
    "category": "Electronics"
  }
}
```

---

### product.updated
Triggered when product is updated.

---

### product.deleted
Triggered when product is deleted.

---

### inventory.low
Triggered when product stock is low.

**Payload:**
```json
{
  "event": "inventory.low",
  "timestamp": "2024-01-01T00:00:00Z",
  "data": {
    "productId": "1",
    "name": "iPhone 15 Pro",
    "currentStock": 5,
    "threshold": 10
  }
}
```

---

## Implementation Example

### Express.js
```typescript
import express from 'express';
import crypto from 'crypto';

const app = express();

app.post('/webhooks/bharatcart', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = req.body.toString();
  
  // Verify signature
  const isValid = verifyWebhook(payload, signature, process.env.WEBHOOK_SECRET);
  
  if (!isValid) {
    return res.status(401).send('Invalid signature');
  }
  
  const event = JSON.parse(payload);
  
  // Handle event
  switch (event.event) {
    case 'order.created':
      handleOrderCreated(event.data);
      break;
    case 'order.paid':
      handleOrderPaid(event.data);
      break;
    // ... other events
  }
  
  res.status(200).send('OK');
});
```

---

## Retry Policy

- Failed webhooks are retried 3 times
- Retry intervals: 1 minute, 10 minutes, 1 hour
- Webhook is disabled after 10 consecutive failures

---

## Testing

Use webhook testing tool:
```bash
curl -X POST https://your-domain.com/webhooks/bharatcart   -H "Content-Type: application/json"   -H "X-Webhook-Signature: test-signature"   -d '{"event":"order.created","data":{...}}'
```

---

## Best Practices

1. **Verify signatures** - Always validate webhook signatures
2. **Idempotency** - Handle duplicate events gracefully
3. **Async processing** - Respond quickly, process asynchronously
4. **Error handling** - Log errors, but return 200 OK
5. **Monitoring** - Track webhook delivery success rate
