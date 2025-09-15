# Multi-stage Production-Ready Dockerfile
# Stage 1: Build dependencies
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /usr/src/app

# Copy package files for dependency caching
COPY package*.json ./

# Install dependencies with npm ci for faster, reliable builds
RUN npm ci --only=production \
    && npm cache clean --force

# Stage 2: Production runtime
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nextjs -u 1001

# Set working directory
WORKDIR /usr/src/app

# Copy node_modules from builder stage
COPY --from=builder --chown=nextjs:nodejs /usr/src/app/node_modules ./node_modules

# Copy package files
COPY --chown=nextjs:nodejs package*.json ./

# Copy source code
COPY --chown=nextjs:nodejs . .

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

# Start development server with proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]
