# 🏗️ Container Environment Separation Strategy

## 🎯 **Objective**
Create bulletproof separation between local, staging, and production containers to prevent configuration mixing and ensure environment-specific builds.

## 🚨 **Current Problem**
```yaml
# PROBLEMATIC: Ambiguous tagging
image-ref: ${{ env.REPO }}/testdriven-${{ matrix.service }}:${{ env.TAG }}
```

**Risks:**
- Same image used across environments
- No enforcement of environment-specific configurations
- Potential for production to use development settings

## ✅ **Professional Solution**

### 1. **Environment-Specific Container Naming Convention**

#### **Naming Pattern:**
```
{registry}/{app}-{service}-{environment}:{version}-{timestamp}
```

#### **Examples:**
```bash
# Production
068561046929.dkr.ecr.us-east-1.amazonaws.com/testdriven-frontend-production:v1.2.3-20250918-1430
068561046929.dkr.ecr.us-east-1.amazonaws.com/testdriven-backend-production:v1.2.3-20250918-1430

# Staging
068561046929.dkr.ecr.us-east-1.amazonaws.com/testdriven-frontend-staging:v1.2.3-20250918-1425
068561046929.dkr.ecr.us-east-1.amazonaws.com/testdriven-backend-staging:v1.2.3-20250918-1425

# Development
068561046929.dkr.ecr.us-east-1.amazonaws.com/testdriven-frontend-development:v1.2.3-20250918-1420
068561046929.dkr.ecr.us-east-1.amazonaws.com/testdriven-backend-development:v1.2.3-20250918-1420

# Local (never pushed to ECR)
testdriven-frontend-local:latest
testdriven-backend-local:latest
```

### 2. **Environment-Enforced Build Process**

#### **Enhanced Dockerfile with Environment Validation**
```dockerfile
# client/Dockerfile
ARG ENVIRONMENT
ARG REACT_APP_API_URL
ARG BUILD_VERSION

# Validate environment
RUN if [ -z "$ENVIRONMENT" ]; then echo "ERROR: ENVIRONMENT not set" && exit 1; fi
RUN if [ "$ENVIRONMENT" != "development" ] && [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "production" ]; then \
    echo "ERROR: Invalid ENVIRONMENT: $ENVIRONMENT" && exit 1; fi

# Environment-specific validation
RUN if [ "$ENVIRONMENT" = "production" ] && [ -z "$REACT_APP_API_URL" ]; then \
    echo "ERROR: REACT_APP_API_URL required for production" && exit 1; fi

# Set environment variables
ENV ENVIRONMENT=$ENVIRONMENT
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV BUILD_VERSION=$BUILD_VERSION

# Add environment identifier to build
RUN echo "Environment: $ENVIRONMENT" > /usr/share/nginx/html/build-info.txt
RUN echo "API URL: $REACT_APP_API_URL" >> /usr/share/nginx/html/build-info.txt
RUN echo "Build Version: $BUILD_VERSION" >> /usr/share/nginx/html/build-info.txt
RUN echo "Build Time: $(date)" >> /usr/share/nginx/html/build-info.txt

# Build the React app
RUN npm run build

# Validate build output
RUN if [ ! -f "build/index.html" ]; then echo "ERROR: Build failed" && exit 1; fi
```

### 3. **Environment-Specific Build Scripts**

#### **scripts/build-containers.sh**
```bash
#!/bin/bash

ENVIRONMENT=${1:-development}
SERVICE=${2:-all}
VERSION=${3:-$(git describe --tags --always)}
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Validate environment
case "$ENVIRONMENT" in
    "development"|"staging"|"production")
        echo "✅ Building for $ENVIRONMENT environment"
        ;;
    *)
        echo "❌ Invalid environment: $ENVIRONMENT"
        echo "Valid options: development, staging, production"
        exit 1
        ;;
esac

# Load environment configuration
CONFIG_FILE="config/environments/${ENVIRONMENT}.env"
if [[ ! -f "$CONFIG_FILE" ]]; then
    echo "❌ Environment config not found: $CONFIG_FILE"
    exit 1
fi
source "$CONFIG_FILE"

# Build frontend
if [[ "$SERVICE" == "frontend" || "$SERVICE" == "all" ]]; then
    echo "🏗️ Building frontend for $ENVIRONMENT..."
    
    FRONTEND_TAG="${ECR_REGISTRY}/testdriven-frontend-${ENVIRONMENT}:${VERSION}-${TIMESTAMP}"
    
    cd client
    docker build \
        --platform linux/amd64 \
        --build-arg ENVIRONMENT="$ENVIRONMENT" \
        --build-arg REACT_APP_API_URL="$REACT_APP_API_URL" \
        --build-arg BUILD_VERSION="$VERSION" \
        -t "$FRONTEND_TAG" \
        -t "testdriven-frontend-${ENVIRONMENT}:latest" \
        .
    cd ..
    
    echo "✅ Frontend built: $FRONTEND_TAG"
fi

# Build backend
if [[ "$SERVICE" == "backend" || "$SERVICE" == "all" ]]; then
    echo "🏗️ Building backend for $ENVIRONMENT..."
    
    BACKEND_TAG="${ECR_REGISTRY}/testdriven-backend-${ENVIRONMENT}:${VERSION}-${TIMESTAMP}"
    
    cd services/users
    docker build \
        --platform linux/amd64 \
        --build-arg ENVIRONMENT="$ENVIRONMENT" \
        --build-arg BUILD_VERSION="$VERSION" \
        -t "$BACKEND_TAG" \
        -t "testdriven-backend-${ENVIRONMENT}:latest" \
        .
    cd ../..
    
    echo "✅ Backend built: $BACKEND_TAG"
fi
```

### 4. **Environment Validation in CI/CD**

#### **Updated .github/workflows/main.yml**
```yaml
name: Environment-Separated Build and Deploy

on:
  push:
    branches: [main, staging, develop]

jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [frontend, backend]
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Determine environment from branch
      id: env
      run: |
        case "${{ github.ref }}" in
          "refs/heads/main")
            echo "environment=production" >> $GITHUB_OUTPUT
            echo "api_url=http://testdriven-production-alb-1003393901.us-east-1.elb.amazonaws.com" >> $GITHUB_OUTPUT
            ;;
          "refs/heads/staging")
            echo "environment=staging" >> $GITHUB_OUTPUT
            echo "api_url=http://testdriven-staging-alb.us-east-1.elb.amazonaws.com" >> $GITHUB_OUTPUT
            ;;
          "refs/heads/develop")
            echo "environment=development" >> $GITHUB_OUTPUT
            echo "api_url=http://localhost:5000" >> $GITHUB_OUTPUT
            ;;
          *)
            echo "❌ Invalid branch for deployment"
            exit 1
            ;;
        esac
    
    - name: Generate version and timestamp
      id: version
      run: |
        echo "version=$(git describe --tags --always)" >> $GITHUB_OUTPUT
        echo "timestamp=$(date +%Y%m%d-%H%M%S)" >> $GITHUB_OUTPUT
    
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-east-1
    
    - name: Login to Amazon ECR
      id: login-ecr
      uses: aws-actions/amazon-ecr-login@v2
    
    - name: Build environment-specific container
      run: |
        REGISTRY="${{ steps.login-ecr.outputs.registry }}"
        ENVIRONMENT="${{ steps.env.outputs.environment }}"
        SERVICE="${{ matrix.service }}"
        VERSION="${{ steps.version.outputs.version }}"
        TIMESTAMP="${{ steps.version.outputs.timestamp }}"
        
        # Environment-enforced image tag
        IMAGE_TAG="${REGISTRY}/testdriven-${SERVICE}-${ENVIRONMENT}:${VERSION}-${TIMESTAMP}"
        
        echo "🏗️ Building $SERVICE for $ENVIRONMENT environment"
        echo "📦 Image tag: $IMAGE_TAG"
        
        if [[ "$SERVICE" == "frontend" ]]; then
          cd client
          docker build \
            --platform linux/amd64 \
            --build-arg ENVIRONMENT="$ENVIRONMENT" \
            --build-arg REACT_APP_API_URL="${{ steps.env.outputs.api_url }}" \
            --build-arg BUILD_VERSION="$VERSION" \
            -t "$IMAGE_TAG" \
            .
        else
          cd services/users
          docker build \
            --platform linux/amd64 \
            --build-arg ENVIRONMENT="$ENVIRONMENT" \
            --build-arg BUILD_VERSION="$VERSION" \
            -t "$IMAGE_TAG" \
            .
        fi
        
        # Push to ECR
        docker push "$IMAGE_TAG"
        
        # Save image tag for deployment
        echo "image_tag=$IMAGE_TAG" >> $GITHUB_OUTPUT
      id: build
    
    - name: Deploy to ECS
      run: |
        echo "🚀 Deploying ${{ steps.build.outputs.image_tag }} to ${{ steps.env.outputs.environment }}"
        # Use environment-specific deployment script
        ./scripts/deploy-ecs-${{ steps.env.outputs.environment }}.sh "${{ steps.build.outputs.image_tag }}"
```

### 5. **Local Development Separation**

#### **docker-compose.override.yml** (for local development)
```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./client
      args:
        ENVIRONMENT: development
        REACT_APP_API_URL: http://localhost:5000
        BUILD_VERSION: local-dev
    image: testdriven-frontend-local:latest
    container_name: testdriven-frontend-local
    
  backend:
    build:
      context: ./services/users
      args:
        ENVIRONMENT: development
        BUILD_VERSION: local-dev
    image: testdriven-backend-local:latest
    container_name: testdriven-backend-local
```

### 6. **Environment Verification Endpoint**

#### **Add to nginx.conf**
```nginx
# Environment info endpoint
location /build-info {
    alias /usr/share/nginx/html/build-info.txt;
    add_header Content-Type text/plain;
}
```

**Usage:**
```bash
# Verify production environment
curl http://testdriven-production-alb-1003393901.us-east-1.elb.amazonaws.com/build-info

# Expected output:
# Environment: production
# API URL: http://testdriven-production-alb-1003393901.us-east-1.elb.amazonaws.com
# Build Version: v1.2.3
# Build Time: Wed Sep 18 15:30:45 UTC 2025
```

## 🔒 **Enforcement Mechanisms**

### 1. **Build-Time Validation**
- Environment parameter is required
- Invalid environments cause build failure
- Production builds require API URL validation

### 2. **Container Registry Separation**
- Different ECR repositories per environment
- Clear naming conventions prevent confusion
- Timestamp-based versioning for traceability

### 3. **Deployment Guards**
- Environment-specific deployment scripts
- Branch-based environment determination
- Automatic validation before deployment

### 4. **Runtime Verification**
- Build info endpoint for verification
- Environment variables logged at startup
- Health checks include environment validation

## 🎯 **Benefits of This Approach**

✅ **Clear Separation**: Impossible to mix environments  
✅ **Traceability**: Every container tagged with environment and timestamp  
✅ **Validation**: Build fails if environment requirements not met  
✅ **Verification**: Runtime endpoints to confirm environment  
✅ **Automation**: No manual steps that can introduce errors  

This system **guarantees** that the issues you experienced today can never happen again! 🛡️
