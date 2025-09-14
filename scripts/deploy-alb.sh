#!/bin/bash

# Deploy Application Load Balancer using CloudFormation
# Usage: ./scripts/deploy-alb.sh [staging|production]

set -e

ENVIRONMENT=${1:-staging}
STACK_NAME="testdriven-${ENVIRONMENT}-alb"
TEMPLATE_FILE="infrastructure/alb-cloudformation.yml"

echo "🚀 Deploying ALB for ${ENVIRONMENT} environment..."

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

# Get default VPC ID
echo "📡 Getting default VPC..."
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query 'Vpcs[0].VpcId' --output text)

if [ "$VPC_ID" = "None" ] || [ -z "$VPC_ID" ]; then
    echo "❌ No default VPC found. Please specify a VPC ID manually."
    exit 1
fi

echo "✅ Using VPC: $VPC_ID"

# Get subnet IDs from the default VPC
echo "📡 Getting subnets..."
SUBNET_IDS=$(aws ec2 describe-subnets \
    --filters "Name=vpc-id,Values=$VPC_ID" \
    --query 'Subnets[].SubnetId' \
    --output text | tr '\t' ',')

if [ -z "$SUBNET_IDS" ]; then
    echo "❌ No subnets found in VPC $VPC_ID"
    exit 1
fi

echo "✅ Using subnets: $SUBNET_IDS"

# Deploy CloudFormation stack
echo "🏗️  Deploying CloudFormation stack..."

# Use environment-specific template if it exists
if [ "$ENVIRONMENT" = "production" ] && [ -f "infrastructure/alb-production.yml" ]; then
    TEMPLATE_FILE="infrastructure/alb-production.yml"
    echo "✅ Using production-specific ALB template"
fi

aws cloudformation deploy \
    --template-file "$TEMPLATE_FILE" \
    --stack-name "$STACK_NAME" \
    --parameter-overrides \
        Environment="$ENVIRONMENT" \
        VpcId="$VPC_ID" \
        SubnetIds="$SUBNET_IDS" \
    --capabilities CAPABILITY_IAM \
    --region us-east-1

# Get the ALB DNS name
echo "📡 Getting ALB DNS name..."
ALB_DNS=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
    --output text \
    --region us-east-1)

echo ""
echo "🎉 ALB deployment complete!"
echo "📋 Stack Name: $STACK_NAME"
echo "🌐 ALB DNS Name: $ALB_DNS"
echo ""
echo "📝 Next steps:"
echo "1. Add this DNS name to your GitHub secrets:"
echo "   LOAD_BALANCER_${ENVIRONMENT^^}_DNS_NAME = http://$ALB_DNS"
echo ""
echo "2. Update your GitHub Actions workflow to use this DNS name"
echo ""
echo "3. Deploy your ECS services to use the target groups created by this stack"
