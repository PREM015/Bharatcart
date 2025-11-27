#!/bin/bash
# Configure Environment
# Purpose: Sets up environment variables
# Description: Creates .env file with defaults

set -e

echo "⚙️  Configuring environment..."

# Check if .env exists
if [ -f .env ]; then
  echo "⚠️  .env file already exists"
  read -p "Do you want to overwrite it? (y/n): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 0
  fi
fi

# Copy example
if [ -f .env.example ]; then
  cp .env.example .env
  echo "✅ Created .env from .env.example"
else
  # Create new .env
  cat > .env << EOF
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/bharatcart"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="$(openssl rand -base64 32)"
JWT_EXPIRES_IN="7d"

# API
API_URL="http://localhost:3000"
NEXT_PUBLIC_API_URL="http://localhost:3000"

# Email (SendGrid)
SENDGRID_API_KEY=""
FROM_EMAIL="noreply@bharatcart.com"

# Storage (AWS S3)
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
AWS_REGION="us-east-1"
S3_BUCKET="bharatcart-uploads"

# Stripe
STRIPE_SECRET_KEY=""
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=""

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_CHAT=false

# Development
NODE_ENV="development"
LOG_LEVEL="debug"
EOF
  echo "✅ Created new .env file"
fi

# Generate random secrets
echo "Generating secrets..."
sed -i.bak "s/JWT_SECRET=.*/JWT_SECRET="$(openssl rand -base64 32)"/" .env
rm .env.bak

echo "✅ Environment configured!"
echo ""
echo "⚠️  Please update the following in .env:"
echo "  - DATABASE_URL"
echo "  - SENDGRID_API_KEY"
echo "  - AWS credentials"
echo "  - STRIPE_SECRET_KEY"
