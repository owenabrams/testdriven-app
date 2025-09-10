#!/bin/bash

# Simple Docker to AWS ECR Deployment Script
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

print_status() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

# Configuration
AWS_REGION=${AWS_DEFAULT_REGION:-us-east-1}
ECR_REPOSITORY="savings-groups-platform"
IMAGE_TAG=${1:-latest}

echo "🐳 Deploying Savings Groups Platform to AWS ECR"
echo "=============================================="

# Check prerequisites
print_status "Checking prerequisites..."
if ! command -v docker &> /dev/null; then
    print_error "Docker not found. Please install Docker first."
    exit 1
fi

if ! command -v aws &> /dev/null; then
    print_error "AWS CLI not found. Please install AWS CLI first."
    exit 1
fi

if ! docker info &> /dev/null; then
    print_error "Docker daemon is not running. Please start Docker."
    exit 1
fi

# Get AWS account ID
print_status "Getting AWS account information..."
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null)
if [ $? -ne 0 ]; then
    print_error "Failed to get AWS account ID. Check your AWS credentials."
    exit 1
fi

ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}"
print_success "AWS Account ID: ${AWS_ACCOUNT_ID}"

# Check if ECR repository exists
print_status "Checking ECR repository..."
if aws ecr describe-repositories --repository-names ${ECR_REPOSITORY} --region ${AWS_REGION} &> /dev/null; then
    print_success "ECR repository '${ECR_REPOSITORY}' found!"
else
    print_error "ECR repository '${ECR_REPOSITORY}' not found!"
    echo ""
    echo "📋 Please create the ECR repository manually:"
    echo "   1. Go to AWS Console → ECR"
    echo "   2. Click 'Create repository'"
    echo "   3. Repository name: ${ECR_REPOSITORY}"
    echo "   4. Keep other settings as default"
    echo "   5. Click 'Create repository'"
    echo ""
    echo "Or run this AWS CLI command:"
    echo "   aws ecr create-repository --repository-name ${ECR_REPOSITORY} --region ${AWS_REGION}"
    echo ""
    exit 1
fi

# Login to ECR
print_status "Logging into ECR..."
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_URI}

# Build Docker image
print_status "Building Docker image (this may take a few minutes)..."
docker build -t ${ECR_REPOSITORY}:${IMAGE_TAG} .
print_success "Docker image built successfully!"

# Tag and push to ECR
print_status "Tagging and pushing to ECR..."
docker tag ${ECR_REPOSITORY}:${IMAGE_TAG} ${ECR_URI}:${IMAGE_TAG}
docker tag ${ECR_REPOSITORY}:${IMAGE_TAG} ${ECR_URI}:latest

docker push ${ECR_URI}:${IMAGE_TAG}
docker push ${ECR_URI}:latest
print_success "Image pushed to ECR!"

print_success "🚀 Deployment completed!"
echo ""
echo "📋 Deployment Summary:"
echo "   Repository: ${ECR_REPOSITORY}"
echo "   Image URI: ${ECR_URI}:${IMAGE_TAG}"
echo "   Region: ${AWS_REGION}"
echo ""
echo "🎯 Next Steps:"
echo "   1. Go to AWS ECS Console"
echo "   2. Create a new ECS Cluster (Fargate)"
echo "   3. Create a Task Definition using the image URI above"
echo "   4. Create a Service to run your container"
echo "   5. Configure Load Balancer for public access"
echo ""
echo "💡 Quick ECS Deploy Command:"
echo "   aws ecs create-cluster --cluster-name savings-groups-cluster"