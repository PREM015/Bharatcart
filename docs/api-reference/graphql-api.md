# GraphQL API Reference

**Endpoint**: `https://api.bharatcart.com/graphql`  
**Authentication**: Bearer Token in `Authorization` header

## Schema

### Queries

#### product
Get single product by ID or slug.

```graphql
query GetProduct($id: ID!) {
  product(id: $id) {
    id
    name
    slug
    description
    price
    currency
    images
    category {
      id
      name
      slug
    }
    brand {
      id
      name
    }
    variants {
      id
      name
      price
      inStock
    }
    inStock
    rating
    reviewCount
  }
}
```

**Variables:**
```json
{
  "id": "1"
}
```

---

#### products
Get list of products with filtering.

```graphql
query GetProducts(
  $category: String
  $limit: Int = 20
  $offset: Int = 0
  $sortBy: ProductSortInput
) {
  products(
    category: $category
    limit: $limit
    offset: $offset
    sortBy: $sortBy
  ) {
    edges {
      node {
        id
        name
        price
        images
        inStock
      }
    }
    pageInfo {
      total
      hasNextPage
    }
  }
}
```

---

#### cart
Get current user's cart.

```graphql
query GetCart {
  cart {
    id
    items {
      id
      product {
        id
        name
        price
        image
      }
      quantity
      subtotal
    }
    subtotal
    tax
    shipping
    total
  }
}
```

---

#### orders
Get user's orders.

```graphql
query GetOrders($limit: Int, $offset: Int) {
  orders(limit: $limit, offset: $offset) {
    edges {
      node {
        id
        status
        total
        createdAt
        items {
          product {
            name
          }
          quantity
        }
      }
    }
    pageInfo {
      total
      hasNextPage
    }
  }
}
```

---

### Mutations

#### addToCart
Add item to cart.

```graphql
mutation AddToCart($input: AddToCartInput!) {
  addToCart(input: $input) {
    cart {
      id
      items {
        id
        product {
          name
        }
        quantity
      }
      total
    }
  }
}
```

**Variables:**
```json
{
  "input": {
    "productId": "1",
    "quantity": 2
  }
}
```

---

#### updateCartItem
Update cart item quantity.

```graphql
mutation UpdateCartItem($id: ID!, $quantity: Int!) {
  updateCartItem(id: $id, quantity: $quantity) {
    cart {
      id
      total
    }
  }
}
```

---

#### createOrder
Create new order.

```graphql
mutation CreateOrder($input: CreateOrderInput!) {
  createOrder(input: $input) {
    order {
      id
      total
      paymentUrl
      status
    }
  }
}
```

**Variables:**
```json
{
  "input": {
    "shippingAddress": {
      "name": "John Doe",
      "street": "123 Main St",
      "city": "Mumbai",
      "state": "Maharashtra",
      "postalCode": "400001"
    },
    "paymentMethod": "stripe"
  }
}
```

---

### Subscriptions

#### orderUpdated
Subscribe to order status updates.

```graphql
subscription OrderUpdated($orderId: ID!) {
  orderUpdated(orderId: $orderId) {
    id
    status
    tracking {
      status
      location
    }
  }
}
```

---

## Types

### Product
```graphql
type Product {
  id: ID!
  name: String!
  slug: String!
  description: String
  price: Float!
  currency: String!
  images: [String!]!
  category: Category!
  brand: Brand
  variants: [ProductVariant!]
  inStock: Boolean!
  stock: Int!
  rating: Float
  reviewCount: Int!
  createdAt: DateTime!
}
```

### Order
```graphql
type Order {
  id: ID!
  status: OrderStatus!
  items: [OrderItem!]!
  shippingAddress: Address!
  billingAddress: Address!
  tracking: Tracking
  payment: Payment!
  subtotal: Float!
  tax: Float!
  shipping: Float!
  total: Float!
  createdAt: DateTime!
}
```

---

## Error Handling

Errors follow GraphQL spec:

```json
{
  "errors": [
    {
      "message": "Product not found",
      "locations": [{ "line": 2, "column": 3 }],
      "path": ["product"],
      "extensions": {
        "code": "NOT_FOUND"
      }
    }
  ],
  "data": {
    "product": null
  }
}
```

---

## Pagination

Using Relay-style cursor pagination:

```graphql
{
  products(first: 10, after: "cursor") {
    edges {
      cursor
      node {
        id
        name
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```
