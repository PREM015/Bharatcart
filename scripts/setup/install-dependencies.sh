#!/bin/bash
# Install Dependencies
# Purpose: Sets up development environment
# Description: Installs Node.js, databases, and tools

set -e

echo "📦 Installing dependencies..."

# Check for Homebrew (macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
  if ! command -v brew &> /dev/null; then
    echo "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  fi
fi

# Install Node.js
if ! command -v node &> /dev/null; then
  echo "Installing Node.js..."
  if [[ "$OSTYPE" == "darwin"* ]]; then
    brew install node@20
  else
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
  fi
fi

echo "Node version: $(node --version)"
echo "npm version: $(npm --version)"

# Install pnpm (optional)
if ! command -v pnpm &> /dev/null; then
  echo "Installing pnpm..."
  npm install -g pnpm
fi

# Install PostgreSQL
if ! command -v psql &> /dev/null; then
  echo "Installing PostgreSQL..."
  if [[ "$OSTYPE" == "darwin"* ]]; then
    brew install postgresql@15
    brew services start postgresql@15
  else
    sudo apt-get install -y postgresql postgresql-contrib
    sudo systemctl start postgresql
  fi
fi

# Install Redis
if ! command -v redis-cli &> /dev/null; then
  echo "Installing Redis..."
  if [[ "$OSTYPE" == "darwin"* ]]; then
    brew install redis
    brew services start redis
  else
    sudo apt-get install -y redis-server
    sudo systemctl start redis
  fi
fi

# Install Docker
if ! command -v docker &> /dev/null; then
  echo "Installing Docker..."
  if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Please install Docker Desktop from https://www.docker.com/products/docker-desktop"
  else
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
  fi
fi

# Install project dependencies
echo "Installing npm packages..."
npm install

echo "✅ All dependencies installed!"
echo ""
echo "Next steps:"
echo "1. Copy .env.example to .env"
echo "2. Run 'npm run setup:database'"
echo "3. Run 'npm run dev'"
