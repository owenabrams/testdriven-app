#!/bin/bash

# Manual Docker Push Script for Limited AWS Permissions
set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }

echo "🐳 Manual Docker Push to AWS ECR"
echo "================================"

# Get user inputs
echo "Please provide the following information from your AWS Console:"
echo ""
read -p "Enter your AWS region (e.g., us-east-1, eu-north-1): " AWS_REGION
read -p "Enter your ECR repository URI (from AWS Console): " ECR_URI

if [ -z "$AWS_REGION" ] || [ -z "$ECR_URI" ]; then
    print_error "Both region and ECR URI are required!"
    exit 1
fi

print_status "Using region: $AWS_REGION"
print_status "Using ECR URI: $ECR_URI"

# Check if Docker image exists
if ! docker images | grep -q "savings-groups-test"; then
    print_status "Building Docker image..."
    docker build -t savings-groups-test .
    print_success "Docker image built!"
else
    print_success "Docker image already exists!"
fi

# Login to ECR
print_status "Logging into ECR..."
if aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_URI; then
    print_success "Successfully logged into ECR!"
else
    print_error "Failed to login to ECR. Please check your AWS credentials and permissions."
    exit 1
fi

# Tag image
print_status "Tagging image..."
docker tag savings-groups-test:latest $ECR_URI:latest
docker tag savings-groups-test:latest $ECR_URI:v1.0
print_success "Image tagged!"

# Push to ECR
print_status "Pushing image to ECR..."
if docker push $ECR_URI:latest && docker push $ECR_URI:v1.0; then
    print_success "🚀 Image successfully pushed to ECR!"
    echo ""
    echo "📋 Deployment Summary:"
    echo "   Repository: $ECR_URI"
    echo "   Tags: latest, v1.0"
    echo "   Region: $AWS_REGION"
    echo ""
    echo "🎯 Next Steps:"
    echo "   1. Go to AWS ECS Console"
    echo "   2. Create a new Cluster (Fargate)"
    echo "   3. Create Task Definition using: $ECR_URI:latest"
    echo "   4. Create Service to run your container"
    echo "   5. Configure Load Balancer for public access"
else
    print_error "Failed to push image to ECR!"
    exit 1
fi