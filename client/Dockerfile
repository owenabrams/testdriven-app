# Multi-stage Production-Ready Dockerfile
# Stage 1: Build the React app
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /usr/src/app

# Copy package files for dependency caching
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Build arguments for environment variables
ARG ENVIRONMENT
ARG REACT_APP_API_URL
ARG BUILD_VERSION
ARG BUILD_TIMESTAMP

# Validate environment (prevents accidental cross-environment builds)
RUN if [ -z "$ENVIRONMENT" ]; then echo "❌ ERROR: ENVIRONMENT not set" && exit 1; fi
RUN if [ "$ENVIRONMENT" != "development" ] && [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "production" ]; then \
    echo "❌ ERROR: Invalid ENVIRONMENT: $ENVIRONMENT. Must be development, staging, or production" && exit 1; fi

# Environment-specific validation
RUN if [ "$ENVIRONMENT" = "production" ] && [ -z "$REACT_APP_API_URL" ]; then \
    echo "❌ ERROR: REACT_APP_API_URL required for production builds" && exit 1; fi

# Set environment variables
ENV ENVIRONMENT=$ENVIRONMENT
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV BUILD_VERSION=$BUILD_VERSION
ENV BUILD_TIMESTAMP=$BUILD_TIMESTAMP

# Build the React app for production
RUN npm run build

# Add environment information to build output
RUN echo "Environment: $ENVIRONMENT" > build/build-info.txt && \
    echo "API URL: $REACT_APP_API_URL" >> build/build-info.txt && \
    echo "Build Version: $BUILD_VERSION" >> build/build-info.txt && \
    echo "Build Timestamp: $BUILD_TIMESTAMP" >> build/build-info.txt && \
    echo "Build Time: $(date)" >> build/build-info.txt

# Validate build output
RUN if [ ! -f "build/index.html" ]; then echo "❌ ERROR: React build failed - index.html not found" && exit 1; fi
RUN if [ ! -d "build/static" ]; then echo "❌ ERROR: React build failed - static assets not found" && exit 1; fi

# Stage 2: Production runtime with nginx
FROM nginx:alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy built React app from builder stage (includes build-info.txt)
COPY --from=builder /usr/src/app/build /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80 || exit 1

# Start nginx with proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["nginx", "-g", "daemon off;"]
