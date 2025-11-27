# Getting Started with BharatCart

**Purpose**: Developer onboarding guide  
**Time**: ~30 minutes

## Prerequisites

Before you begin, ensure you have:
- Node.js 20.x or higher
- npm or pnpm
- PostgreSQL 15.x
- Redis 7.x
- Git

## Installation

### 1. Clone Repository
```bash
git clone https://github.com/bharatcart/bharatcart.git
cd bharatcart
```

### 2. Install Dependencies
```bash
npm install
# or
pnpm install
```

### 3. Environment Setup
```bash
# Copy environment file
cp .env.example .env

# Or run setup script
npm run setup:env
```

Edit `.env` with your configuration:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/bharatcart"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-secret-key"
```

### 4. Database Setup
```bash
# Create database
npm run setup:database

# Run migrations
npx prisma migrate dev

# Seed data
npx prisma db seed
```

### 5. Start Development Server
```bash
npm run dev
```

Visit http://localhost:3000

## Project Structure

```
bharatcart/
├── src/
│   ├── app/           # Next.js app router
│   ├── components/    # React components
│   ├── lib/           # Utilities
│   ├── services/      # Business logic
│   └── types/         # TypeScript types
├── prisma/
│   ├── schema.prisma  # Database schema
│   └── migrations/    # Database migrations
├── public/            # Static files
└── tests/             # Test files
```

## Key Features

### 1. Authentication
```typescript
// Login example
import { signIn } from '@/lib/auth';

const { user, token } = await signIn({
  email: 'user@example.com',
  password: 'password123'
});
```

### 2. Products
```typescript
// Fetch products
import { getProducts } from '@/services/productService';

const products = await getProducts({
  category: 'electronics',
  limit: 10
});
```

### 3. Cart
```typescript
// Add to cart
import { addToCart } from '@/services/cartService';

await addToCart({
  productId: 123,
  quantity: 2
});
```

## Development Workflow

### Running Tests
```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage
npm run test:coverage
```

### Code Quality
```bash
# Linting
npm run lint

# Format code
npm run format

# Type checking
npm run type-check
```

### Database Commands
```bash
# Create migration
npx prisma migrate dev --name add_users_table

# View database
npx prisma studio

# Reset database
npx prisma migrate reset
```

## Common Tasks

### Adding a New Page
```bash
# Create new page
touch src/app/products/page.tsx
```

```typescript
// src/app/products/page.tsx
export default function ProductsPage() {
  return <div>Products</div>;
}
```

### Creating API Endpoint
```typescript
// src/app/api/products/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const products = await prisma.product.findMany();
  return NextResponse.json(products);
}
```

### Adding Database Model
```prisma
// prisma/schema.prisma
model Product {
  id          Int      @id @default(autoincrement())
  name        String
  price       Decimal
  description String?
  createdAt   DateTime @default(now())
}
```

Then run:
```bash
npx prisma migrate dev --name add_product_model
```

## Troubleshooting

### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Database Connection Error
```bash
# Check PostgreSQL is running
pg_isready

# Restart PostgreSQL
brew services restart postgresql
# or
sudo systemctl restart postgresql
```

### Module Not Found
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

- Read [Architecture Documentation](../ARCHITECTURE.md)
- Explore [API Reference](../api-reference/rest-api.md)
- Join our [Slack community](#)
- Review [Contributing Guidelines](../../CONTRIBUTING.md)

## Getting Help

- 📖 [Documentation](../README.md)
- 💬 [Slack](https://bharatcart.slack.com)
- 🐛 [GitHub Issues](https://github.com/bharatcart/bharatcart/issues)
- 📧 [Email Support](mailto:dev@bharatcart.com)
