# 🛒 BharatCart - Modern E-commerce Platform

<div align="center">

![BharatCart Logo](public/images/BharatCart%20Logo.png)

**Your Trusted Online Shopping Destination**

[![Next.js](https://img.shields.io/badge/Next.js-14.0-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.0-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-316192?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.0-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)

[Live Demo](#) • [Documentation](#) • [Report Bug](#) • [Request Feature](#)

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Database Setup](#-database-setup)
- [API Documentation](#-api-documentation)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

**BharatCart** is a full-featured, production-ready e-commerce platform built with modern web technologies. It offers a seamless shopping experience with advanced features like AI-powered recommendations, real-time notifications, multi-vendor support, and comprehensive admin dashboard.

### 🎯 Key Highlights

- 🚀 **Next.js 14** with App Router for optimal performance
- 💎 **TypeScript** for type-safe development
- 🗄️ **Prisma ORM** with PostgreSQL for robust data management
- 🎨 **Tailwind CSS** for beautiful, responsive UI
- 🔒 **JWT Authentication** with secure session management
- 💳 **Stripe Integration** for seamless payments
- 🤖 **AI Chatbot** for customer support
- 📱 **PWA Support** for mobile-first experience
- 📊 **Analytics Dashboard** for business insights

---

## ✨ Features

### 🛍️ **Customer Features**

#### **Shopping Experience**
- ✅ Browse products by categories and brands
- ✅ Advanced search with filters (price, rating, brand, etc.)
- ✅ Product quick view and detailed view
- ✅ Product image gallery with zoom
- ✅ Product variants (size, color, etc.)
- ✅ Recently viewed products tracking
- ✅ Product comparison (side-by-side)

#### **Cart & Checkout**
- ✅ Add to cart with quantity selection
- ✅ Mini cart dropdown
- ✅ Cart summary with price breakdown
- ✅ Coupon code application
- ✅ Multiple saved addresses
- ✅ Guest checkout option
- ✅ Order review before payment
- ✅ Multiple payment methods (Card, UPI, COD, Wallet)

#### **User Account**
- ✅ User registration & login
- ✅ Email & phone verification (OTP)
- ✅ Password reset functionality
- ✅ Profile management with avatar
- ✅ Order history with tracking
- ✅ Saved addresses management
- ✅ Wishlist functionality
- ✅ Review & rating system
- ✅ Loyalty points & rewards

#### **Notifications & Alerts**
- ✅ Real-time order status updates
- ✅ Price drop alerts
- ✅ Stock availability alerts
- ✅ Email notifications
- ✅ Push notifications (PWA)
- ✅ Newsletter subscription

#### **Advanced Features**
- ✅ AI-powered product recommendations
- ✅ AI chatbot for customer support
- ✅ Voice search capability
- ✅ Virtual shopping assistant
- ✅ Social sharing (Facebook, Twitter, WhatsApp)
- ✅ Product Q&A section
- ✅ Return & refund requests

---

### 🏪 **Vendor/Admin Features**

#### **Store Management**
- ✅ Multi-vendor marketplace support
- ✅ Store profile customization
- ✅ Store URL (custom subdomain)
- ✅ Store analytics dashboard

#### **Product Management**
- ✅ Add/Edit/Delete products
- ✅ Bulk product upload
- ✅ Product variants management
- ✅ Inventory tracking
- ✅ Low stock alerts
- ✅ Product categories & tags
- ✅ SEO optimization (meta tags)
- ✅ Featured/Trending/Bestseller flags

#### **Order Management**
- ✅ Order processing workflow
- ✅ Order status updates
- ✅ Shipping label generation
- ✅ Tracking number assignment
- ✅ Return/refund processing
- ✅ Order notes & comments
- ✅ Bulk order export

#### **Marketing Tools**
- ✅ Coupon code generation
- ✅ Flash sales management
- ✅ Banner & slider management
- ✅ Email campaign management
- ✅ Loyalty program configuration
- ✅ Gift card issuance

#### **Analytics & Reports**
- ✅ Sales analytics
- ✅ Revenue tracking
- ✅ Customer insights
- ✅ Product performance metrics
- ✅ Inventory reports
- ✅ Export data (CSV/Excel)

#### **User Management**
- ✅ Customer list & profiles
- ✅ User activity logs
- ✅ Review moderation
- ✅ Q&A moderation
- ✅ Newsletter subscribers

---

### 🔧 **Technical Features**

#### **Performance**
- ✅ Server-side rendering (SSR)
- ✅ Static site generation (SSG)
- ✅ Image optimization (Next/Image)
- ✅ Code splitting & lazy loading
- ✅ API route caching
- ✅ Database query optimization
- ✅ CDN integration (Cloudinary)

#### **Security**
- ✅ JWT authentication
- ✅ Refresh token rotation
- ✅ Password hashing (bcrypt)
- ✅ CSRF protection
- ✅ XSS prevention
- ✅ SQL injection prevention (Prisma)
- ✅ Rate limiting
- ✅ Session management
- ✅ Two-factor authentication (2FA)

#### **SEO & Accessibility**
- ✅ Dynamic meta tags
- ✅ Sitemap generation
- ✅ Robots.txt
- ✅ Structured data (JSON-LD)
- ✅ Open Graph tags
- ✅ Twitter Cards
- ✅ ARIA labels
- ✅ Keyboard navigation

#### **Developer Experience**
- ✅ TypeScript for type safety
- ✅ ESLint & Prettier configuration
- ✅ Git hooks (Husky)
- ✅ Comprehensive error handling
- ✅ API documentation
- ✅ Database migrations
- ✅ Seed data for development
- ✅ Environment variable validation

---

## 🛠️ Tech Stack

### **Frontend**
| Technology | Purpose | Version |
|------------|---------|---------|
| [Next.js](https://nextjs.org/) | React Framework | 14.x |
| [React](https://react.dev/) | UI Library | 18.x |
| [TypeScript](https://www.typescriptlang.org/) | Type Safety | 5.x |
| [Tailwind CSS](https://tailwindcss.com/) | Styling | 3.x |

### **Backend**
| Technology | Purpose | Version |
|------------|---------|---------|
| [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction) | REST API | 14.x |
| [Prisma](https://www.prisma.io/) | ORM | 5.x |
| [PostgreSQL](https://www.postgresql.org/) | Database | 15.x |

### **Authentication & Security**
| Technology | Purpose |
|------------|---------|
| [JWT](https://jwt.io/) | Token-based Auth |
| [bcryptjs](https://www.npmjs.com/package/bcryptjs) | Password Hashing |
| [cookie](https://www.npmjs.com/package/cookie) | Cookie Management |

### **Payment & Services**
| Service | Purpose |
|---------|---------|
| [Stripe](https://stripe.com/) | Payment Processing |
| [Cloudinary](https://cloudinary.com/) | Image Management |
| [Nodemailer](https://nodemailer.com/) | Email Service |
| [Razorpay](https://razorpay.com/) | Indian Payments (UPI, Wallets) |

### **AI & Analytics**
| Service | Purpose |
|---------|---------|
| OpenAI API | AI Chatbot & Recommendations |
| Google Analytics | Traffic Analytics |
| Vercel Analytics | Performance Monitoring |

### **Development Tools**
| Tool | Purpose |
|------|---------|
| ESLint | Code Linting |
| Prettier | Code Formatting |
| Husky | Git Hooks |
| Jest | Unit Testing |
| Cypress | E2E Testing |

---

## 📁 Project Structure

```
ecommerce/
├── 📂 public/                    # Static files
│   ├── images/                   # Product & UI images
│   ├── icons/                    # PWA icons
│   ├── manifest.json             # PWA manifest
│   └── robots.txt                # SEO robots file
│
├── 📂 prisma/                    # Database
│   ├── schema.prisma             # Database schema
│   └── seed.ts                   # Seed data
│
├── 📂 src/
│   ├── 📂 app/                   # Next.js App Router
│   │   ├── (auth)/               # Auth pages (login, register)
│   │   ├── (shop)/               # Shop pages (products, categories)
│   │   ├── (user)/               # User pages (profile, orders)
│   │   ├── admin/                # Admin dashboard
│   │   ├── checkout/             # Checkout flow
│   │   ├── api/                  # API routes
│   │   ├── layout.tsx            # Root layout
│   │   └── page.tsx              # Homepage
│   │
│   ├── 📂 components/            # React components
│   │   ├── auth/                 # Auth components
│   │   ├── cart/                 # Cart components
│   │   ├── checkout/             # Checkout components
│   │   ├── product/              # Product components
│   │   ├── user/                 # User dashboard components
│   │   ├── admin/                # Admin components
│   │   ├── search/               # Search components
│   │   ├── common/               # Shared components
│   │   ├── ai/                   # AI chatbot components
│   │   └── ui/                   # UI primitives
│   │
│   ├── 📂 lib/                   # Core logic
│   │   ├── api/                  # API client
│   │   ├── controllers/          # Business logic
│   │   ├── middleware/           # API middleware
│   │   ├── models/               # Data models
│   │   ├── services/             # External services
│   │   ├── validators/           # Input validation
│   │   └── prisma.ts             # Prisma client
│   │
│   ├── 📂 hooks/                 # Custom React hooks
│   ├── 📂 context/               # React Context providers
│   ├── 📂 types/                 # TypeScript types
│   ├── 📂 utils/                 # Utility functions
│   ├── 📂 constants/             # App constants
│   ├── 📂 config/                # App configuration
│   ├── 📂 styles/                # Global styles
│   └── 📂 ai/                    # AI/ML features
│
├── 📄 .env                       # Environment variables
├── 📄 .env.example               # Env template
├── 📄 next.config.js             # Next.js config
├── 📄 tailwind.config.ts         # Tailwind config
├── 📄 tsconfig.json              # TypeScript config
├── 📄 package.json               # Dependencies
└── 📄 README.md                  # This file
```

---

## 🚀 Getting Started

### **Prerequisites**

- Node.js 18.x or higher
- PostgreSQL 14.x or higher
- npm/yarn/pnpm
- Git

### **Installation**

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/bharatcart.git
cd bharatcart
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```
Then edit `.env` with your configuration (see [Environment Variables](#-environment-variables))

4. **Set up the database**
```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed the database (optional)
npm run db:seed
```

5. **Start the development server**
```bash
npm run dev
```

6. **Open your browser**
```
http://localhost:3000
```

---

## 🔐 Environment Variables

Create a `.env` file in the root directory:

```env
# ============================================================================
# DATABASE
# ============================================================================
DATABASE_URL="postgresql://user:password@localhost:5432/bharatcart?schema=public"
DIRECT_URL="postgresql://user:password@localhost:5432/bharatcart?schema=public"

# ============================================================================
# APP CONFIGURATION
# ============================================================================
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME="BharatCart"

# ============================================================================
# AUTHENTICATION
# ============================================================================
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
JWT_REFRESH_SECRET=your-refresh-token-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ============================================================================
# STRIPE PAYMENT
# ============================================================================
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# ============================================================================
# RAZORPAY (Indian Payments)
# ============================================================================
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key_id

# ============================================================================
# CLOUDINARY (Image Upload)
# ============================================================================
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name

# ============================================================================
# EMAIL (SMTP)
# ============================================================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
EMAIL_FROM="BharatCart <noreply@bharatcart.com>"

# ============================================================================
# AI SERVICES
# ============================================================================
OPENAI_API_KEY=sk-your-openai-api-key
NEXT_PUBLIC_ENABLE_AI_CHATBOT=true

# ============================================================================
# ANALYTICS
# ============================================================================
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_ENABLE_ANALYTICS=true

# ============================================================================
# STORAGE
# ============================================================================
UPLOAD_MAX_SIZE=5242880  # 5MB in bytes
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/webp,image/gif

# ============================================================================
# RATE LIMITING
# ============================================================================
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes

# ============================================================================
# SECURITY
# ============================================================================
BCRYPT_ROUNDS=10
OTP_EXPIRY_MINUTES=10
PASSWORD_RESET_EXPIRY_HOURS=1

# ============================================================================
# BUSINESS CONFIGURATION
# ============================================================================
DEFAULT_CURRENCY=INR
TAX_RATE=18
FREE_SHIPPING_THRESHOLD=999
STANDARD_SHIPPING_COST=50
EXPRESS_SHIPPING_COST=100
DEFAULT_COMMISSION_RATE=10
```

---

## 🗄️ Database Setup

### **Using PostgreSQL Locally**

1. **Install PostgreSQL**
```bash
# macOS
brew install postgresql

# Ubuntu
sudo apt install postgresql

# Windows
# Download from https://www.postgresql.org/download/windows/
```

2. **Create Database**
```bash
psql postgres
CREATE DATABASE bharatcart;
CREATE USER bharatuser WITH PASSWORD 'yourpassword';
GRANT ALL PRIVILEGES ON DATABASE bharatcart TO bharatuser;
\q
```

3. **Update DATABASE_URL in `.env`**
```env
DATABASE_URL="postgresql://bharatuser:yourpassword@localhost:5432/bharatcart"
```

### **Using Cloud Database (Recommended for Production)**

**Neon (Serverless PostgreSQL)**
```bash
# Sign up at https://neon.tech
# Create a project
# Copy the connection string to .env
```

**Supabase**
```bash
# Sign up at https://supabase.com
# Create a project
# Copy the connection string to .env
```

### **Database Commands**

```bash
# Generate Prisma Client
npx prisma generate

# Create migration
npx prisma migrate dev --name init

# Push schema without migration (development)
npx prisma db push

# Reset database
npx prisma migrate reset

# Seed database
npm run db:seed

# Open Prisma Studio (Database GUI)
npx prisma studio
```

---

## 📡 API Documentation

### **Authentication**

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "+919876543210"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

#### Password Reset Request
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "john@example.com"
}
```

---

### **Products**

#### Get All Products
```http
GET /api/products?page=1&limit=20&category=electronics&sort=price-asc
```

#### Get Single Product
```http
GET /api/products/[id]
```

#### Create Product (Admin)
```http
POST /api/products
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "iPhone 15 Pro",
  "description": "Latest iPhone",
  "price": 134900,
  "categoryId": "cat-id",
  "stock": 50,
  "images": ["url1", "url2"]
}
```

---

### **Cart**

#### Get Cart
```http
GET /api/cart
Authorization: Bearer {token}
```

#### Add to Cart
```http
POST /api/cart
Authorization: Bearer {token}
Content-Type: application/json

{
  "productId": "prod-id",
  "quantity": 1,
  "variantId": "var-id"
}
```

---

### **Orders**

#### Create Order
```http
POST /api/checkout
Authorization: Bearer {token}
Content-Type: application/json

{
  "shippingAddress": {...},
  "paymentMethod": "UPI",
  "couponCode": "SAVE10"
}
```

#### Get Order Details
```http
GET /api/orders/[orderId]
Authorization: Bearer {token}
```

#### Track Order
```http
GET /api/orders/track?orderNumber=ORD123456
```

---

### **Wishlist**

#### Get Wishlist
```http
GET /api/wishlist
Authorization: Bearer {token}
```

#### Add to Wishlist
```http
POST /api/wishlist
Authorization: Bearer {token}
Content-Type: application/json

{
  "productId": "prod-id"
}
```

---

### **Reviews**

#### Get Product Reviews
```http
GET /api/reviews/[productId]
```

#### Submit Review
```http
POST /api/reviews
Authorization: Bearer {token}
Content-Type: application/json

{
  "productId": "prod-id",
  "rating": 5,
  "title": "Excellent product",
  "comment": "Highly recommend!"
}
```

---

## 📱 Default Login Credentials

After running `npm run db:seed`, use these credentials:

### **Admin Account**
- **Email:** `admin@bharatcart.com`
- **Password:** `password123`

### **Customer Accounts**
- **Email:** `rahul@example.com` | **Password:** `password123`
- **Email:** `priya@example.com` | **Password:** `password123`

---

## 🎨 Customization

### **Branding**

Update these files:
- `public/images/BharatCart Logo.png` - Your logo
- `src/constants/routes.ts` - App navigation
- `src/constants/colors.ts` - Color scheme
- `public/manifest.json` - PWA configuration

### **Theme**

Edit `src/styles/variables.css`:
```css
:root {
  --primary-color: #3b82f6;
  --secondary-color: #10b981;
  --accent-color: #f59e0b;
}
```

---

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run E2E tests
npm run test:e2e

# Test coverage
npm run test:coverage
```

---

## 📦 Deployment

### **Vercel (Recommended)**

1. Push code to GitHub
2. Import project on [Vercel](https://vercel.com)
3. Add environment variables
4. Deploy

```bash
# Or use Vercel CLI
npm i -g vercel
vercel
```

### **Docker**

```bash
# Build image
docker build -t bharatcart .

# Run container
docker run -p 3000:3000 bharatcart
```

### **Manual Deployment**

```bash
# Build production
npm run build

# Start production server
npm start
```

---

## 🐛 Troubleshooting

### **Database Connection Issues**
```bash
# Test database connection
npx prisma db pull

# Reset and reseed
npx prisma migrate reset
npm run db:seed
```

### **Port Already in Use**
```bash
# Kill process on port 3000
npx kill-port 3000
```

### **Module Not Found**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### **Coding Standards**
- Follow ESLint rules
- Write TypeScript types
- Add comments for complex logic
- Write tests for new features

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Authors

- **PREM RAJ** - *Initial work* - [PREM015](https://github.com/prem015)

---

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Prisma team for the excellent ORM
- Vercel for hosting platform
- All open-source contributors

---

## 📞 Support

- 📧 Email: support@bharatcart.com
- 💬 Discord: [Join our community](#)
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/bharatcart/issues)

---

## 🗺️ Roadmap

- [ ] Mobile app (React Native)
- [ ] Multi-language support
- [ ] AR product preview
- [ ] Live chat support
- [ ] Subscription service
- [ ] Marketplace API
- [ ] Advanced analytics
- [ ] Blockchain integration

---

<div align="center">

**Made with ❤️ by BharatCart Team**

⭐ Star us on GitHub — it helps!

[Website](#) • [Twitter](#) • [LinkedIn](#)

</div>

---

## 📊 Project Statistics

```
Total Lines of Code: 50,000+
Total Components: 150+
API Endpoints: 40+
Database Models: 25+
Test Coverage: 80%+
Performance Score: 95+
```

---

**Last Updated:** December 2025  
**Version:** 1.0.0  
**Status:** Production Ready ✅