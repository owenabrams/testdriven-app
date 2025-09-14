#!/bin/bash

# Deploy RDS PostgreSQL database for production
# Usage: ./scripts/deploy-rds.sh [staging|production] [db-password]

set -e

ENVIRONMENT=${1:-production}
DB_PASSWORD=${2}
REGION=${AWS_DEFAULT_REGION:-us-east-1}

# Stack names
ALB_STACK_NAME="testdriven-${ENVIRONMENT}-alb"
RDS_STACK_NAME="testdriven-${ENVIRONMENT}-rds"

echo "🗃️  Deploying RDS PostgreSQL for ${ENVIRONMENT} environment..."

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

# Check if password is provided
if [ -z "$DB_PASSWORD" ]; then
    echo "❌ Database password is required."
    echo "Usage: $0 [staging|production] [db-password]"
    echo "Example: $0 production MySecurePassword123!"
    exit 1
fi

# Validate password strength
if [[ ${#DB_PASSWORD} -lt 8 ]]; then
    echo "❌ Password must be at least 8 characters long."
    exit 1
fi

echo "✅ Using environment: $ENVIRONMENT"
echo "✅ Using region: $REGION"

# Check if ALB stack exists
if ! aws cloudformation describe-stacks --stack-name "$ALB_STACK_NAME" --region "$REGION" > /dev/null 2>&1; then
    echo "❌ ALB stack '$ALB_STACK_NAME' not found. Please deploy ALB first:"
    echo "   ./scripts/deploy-alb.sh $ENVIRONMENT"
    exit 1
fi

# Get ALB stack outputs
echo "📡 Getting ALB stack outputs..."
ALB_OUTPUTS=$(aws cloudformation describe-stacks \
    --stack-name "$ALB_STACK_NAME" \
    --query 'Stacks[0].Outputs' \
    --region "$REGION")

ALB_SECURITY_GROUP_ID=$(echo "$ALB_OUTPUTS" | jq -r '.[] | select(.OutputKey=="SecurityGroupId") | .OutputValue')
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query 'Vpcs[0].VpcId' --output text --region "$REGION")
SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query 'Subnets[].SubnetId' --output text --region "$REGION" | tr '\t' ',')

echo "✅ ALB Security Group ID: $ALB_SECURITY_GROUP_ID"
echo "✅ VPC ID: $VPC_ID"
echo "✅ Subnet IDs: $SUBNET_IDS"

# Deploy RDS stack
echo "🏗️  Deploying RDS stack..."
aws cloudformation deploy \
    --template-file "infrastructure/rds-production.yml" \
    --stack-name "$RDS_STACK_NAME" \
    --parameter-overrides \
        Environment="$ENVIRONMENT" \
        VpcId="$VPC_ID" \
        SubnetIds="$SUBNET_IDS" \
        ALBSecurityGroupId="$ALB_SECURITY_GROUP_ID" \
        DBMasterUsername="webapp" \
        DBMasterPassword="$DB_PASSWORD" \
    --capabilities CAPABILITY_NAMED_IAM \
    --region "$REGION"

# Wait for RDS instance to be available
echo "⏳ Waiting for RDS instance to be available..."
DB_IDENTIFIER="testdriven-${ENVIRONMENT}"

while true; do
    DB_STATUS=$(aws rds describe-db-instances \
        --db-instance-identifier "$DB_IDENTIFIER" \
        --query 'DBInstances[0].DBInstanceStatus' \
        --output text \
        --region "$REGION")
    
    echo "📊 Current status: $DB_STATUS"
    
    if [ "$DB_STATUS" = "available" ]; then
        break
    elif [ "$DB_STATUS" = "failed" ]; then
        echo "❌ RDS instance creation failed"
        exit 1
    fi
    
    sleep 30
done

# Get RDS endpoint
DB_ENDPOINT=$(aws rds describe-db-instances \
    --db-instance-identifier "$DB_IDENTIFIER" \
    --query 'DBInstances[0].Endpoint.Address' \
    --output text \
    --region "$REGION")

echo ""
echo "🎉 RDS deployment completed!"
echo "📋 Database Details:"
echo "   Instance ID: $DB_IDENTIFIER"
echo "   Endpoint: $DB_ENDPOINT"
echo "   Database: users_${ENVIRONMENT}"
echo "   Username: webapp"
echo ""
echo "🔗 Connection String:"
echo "   postgresql://webapp:${DB_PASSWORD}@${DB_ENDPOINT}:5432/users_${ENVIRONMENT}"
echo ""
echo "📝 Next steps:"
echo "1. Update your ECS task definitions to use this RDS endpoint"
echo "2. Remove the PostgreSQL container from your task definitions"
echo "3. Update environment variables in your application"
echo "4. Deploy updated ECS services"
echo ""
echo "⚠️  Security Note:"
echo "   The database is only accessible from within the VPC"
echo "   Use SSH tunneling through an EC2 instance for direct access"
