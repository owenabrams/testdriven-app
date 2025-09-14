#!/bin/bash

# Update ECS services to use latest images
# Usage: ./scripts/update-ecs-services.sh [staging|production]

set -e

ENVIRONMENT=${1:-staging}
REGION=${AWS_DEFAULT_REGION:-us-east-1}
CLUSTER_NAME="testdriven-${ENVIRONMENT}-cluster"

echo "🔄 Updating ECS services for ${ENVIRONMENT} environment..."

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

# Update Client Service
echo "🔄 Updating client service..."
aws ecs update-service \
    --cluster "$CLUSTER_NAME" \
    --service "testdriven-client-${ENVIRONMENT}-service" \
    --force-new-deployment \
    --region "$REGION" > /dev/null

echo "✅ Client service update initiated"

# Update Users Service
echo "🔄 Updating users service..."
aws ecs update-service \
    --cluster "$CLUSTER_NAME" \
    --service "testdriven-users-${ENVIRONMENT}-service" \
    --force-new-deployment \
    --region "$REGION" > /dev/null

echo "✅ Users service update initiated"

echo ""
echo "🎉 Service updates initiated!"
echo "📋 Monitor progress in ECS Console or use:"
echo "   aws ecs describe-services --cluster $CLUSTER_NAME --services testdriven-client-${ENVIRONMENT}-service testdriven-users-${ENVIRONMENT}-service"
