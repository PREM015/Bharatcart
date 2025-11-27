# Scheduler Service Dockerfile
# Purpose: Cron job runner container
# Description: Executes scheduled tasks and periodic jobs

FROM node:20-alpine

WORKDIR /app

# Install dependencies
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs &&     adduser -S nodejs -u 1001

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --production=true &&     npm cache clean --force

# Copy source code
COPY src ./src

# Change ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Start scheduler
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/scheduler/index.js"]
