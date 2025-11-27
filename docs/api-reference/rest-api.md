# REST API Reference

**Base URL**: `https://api.bharatcart.com/v1`  
**Authentication**: Bearer Token

## Authentication

### POST /auth/login
Login with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 604800
}
```

**Status Codes:**
- `200` - Success
- `401` - Invalid credentials
- `422` - Validation error

---

### POST /auth/register
Create a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### POST /auth/refresh
Refresh access token.

**Headers:**
```
Authorization: Bearer <refresh_token>
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 604800
}
```

---

## Products

### GET /products
Get list of products.

**Query Parameters:**
- `page` (integer) - Page number (default: 1)
- `limit` (integer) - Items per page (default: 20, max: 100)
- `category` (string) - Filter by category slug
- `sort` (string) - Sort field (price, createdAt, name)
- `order` (string) - Sort order (asc, desc)
- `search` (string) - Search query

**Example:**
```
GET /products?category=electronics&sort=price&order=asc&limit=10
```

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "iPhone 15 Pro",
      "slug": "iphone-15-pro",
      "price": 99999,
      "currency": "INR",
      "images": ["https://cdn.bharatcart.com/products/1.jpg"],
      "category": {
        "id": 1,
        "name": "Electronics",
        "slug": "electronics"
      },
      "inStock": true,
      "rating": 4.5,
      "reviewCount": 120
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 10,
    "totalPages": 15
  }
}
```

---

### GET /products/:id
Get single product details.

**Response:**
```json
{
  "id": 1,
  "name": "iPhone 15 Pro",
  "slug": "iphone-15-pro",
  "description": "Latest iPhone with A17 Pro chip",
  "price": 99999,
  "compareAtPrice": 109999,
  "currency": "INR",
  "images": [
    "https://cdn.bharatcart.com/products/1-1.jpg",
    "https://cdn.bharatcart.com/products/1-2.jpg"
  ],
  "category": {
    "id": 1,
    "name": "Electronics",
    "slug": "electronics"
  },
  "brand": {
    "id": 5,
    "name": "Apple",
    "slug": "apple"
  },
  "variants": [
    {
      "id": 1,
      "name": "128GB Space Black",
      "price": 99999,
      "inStock": true
    }
  ],
  "specifications": {
    "screen": "6.1 inch",
    "processor": "A17 Pro",
    "ram": "8GB"
  },
  "inStock": true,
  "stock": 50,
  "rating": 4.5,
  "reviewCount": 120,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

---

## Cart

### GET /cart
Get current user's cart.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": 1,
  "items": [
    {
      "id": 1,
      "product": {
        "id": 1,
        "name": "iPhone 15 Pro",
        "price": 99999,
        "image": "https://cdn.bharatcart.com/products/1.jpg"
      },
      "quantity": 2,
      "subtotal": 199998
    }
  ],
  "subtotal": 199998,
  "tax": 35999,
  "shipping": 0,
  "total": 235997
}
```

---

### POST /cart/items
Add item to cart.

**Request:**
```json
{
  "productId": 1,
  "variantId": 1,
  "quantity": 2
}
```

**Response:**
```json
{
  "id": 1,
  "items": [...],
  "total": 235997
}
```

---

### PATCH /cart/items/:id
Update cart item quantity.

**Request:**
```json
{
  "quantity": 3
}
```

---

### DELETE /cart/items/:id
Remove item from cart.

**Response:**
```json
{
  "message": "Item removed from cart"
}
```

---

## Orders

### POST /orders
Create new order.

**Request:**
```json
{
  "shippingAddress": {
    "name": "John Doe",
    "street": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "postalCode": "400001",
    "country": "IN",
    "phone": "+919876543210"
  },
  "billingAddress": {
    // Same as shipping or different
  },
  "paymentMethod": "stripe",
  "shippingMethod": "standard"
}
```

**Response:**
```json
{
  "orderId": "ORD-2024-00001",
  "total": 235997,
  "paymentUrl": "https://checkout.stripe.com/...",
  "status": "pending"
}
```

---

### GET /orders
Get user's orders.

**Query Parameters:**
- `page` (integer)
- `limit` (integer)
- `status` (string) - pending, processing, shipped, delivered, cancelled

**Response:**
```json
{
  "data": [
    {
      "id": "ORD-2024-00001",
      "total": 235997,
      "status": "delivered",
      "createdAt": "2024-01-01T00:00:00Z",
      "items": [...]
    }
  ],
  "meta": {
    "total": 10,
    "page": 1
  }
}
```

---

### GET /orders/:id
Get order details.

**Response:**
```json
{
  "id": "ORD-2024-00001",
  "status": "delivered",
  "items": [...],
  "shippingAddress": {...},
  "tracking": {
    "carrier": "BlueDart",
    "trackingNumber": "BD123456789",
    "status": "delivered",
    "estimatedDelivery": "2024-01-05T00:00:00Z"
  },
  "payment": {
    "method": "stripe",
    "status": "paid",
    "transactionId": "txn_123"
  },
  "subtotal": 199998,
  "tax": 35999,
  "shipping": 0,
  "total": 235997,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

**Error Codes:**
- `VALIDATION_ERROR` - Invalid input
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `INTERNAL_ERROR` - Server error

---

## Rate Limiting

- **Limit**: 100 requests per 15 minutes per IP
- **Headers**:
  - `X-RateLimit-Limit`: Total allowed requests
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset timestamp

---

## Pagination

All list endpoints support pagination:

**Query Parameters:**
- `page` - Page number (starts at 1)
- `limit` - Items per page (max 100)

**Response:**
```json
{
  "data": [...],
  "meta": {
    "total": 1000,
    "page": 1,
    "limit": 20,
    "totalPages": 50
  }
}
```

---

## Versioning

API version is in the URL: `/v1/`

Current version: **v1**

Deprecated versions will be supported for 12 months.
