#!/bin/bash

# Connect to RDS database via SSH tunnel
# Usage: ./scripts/connect-rds.sh [staging|production]

set -e

ENVIRONMENT=${1:-production}
REGION=${AWS_DEFAULT_REGION:-us-east-1}

echo "🔗 Setting up connection to RDS ${ENVIRONMENT} database..."

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

# Get RDS endpoint
echo "📡 Getting RDS endpoint..."
RDS_STACK_NAME="testdriven-${ENVIRONMENT}-rds"
DB_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name "$RDS_STACK_NAME" \
    --query 'Stacks[0].Outputs[?OutputKey==`DBEndpoint`].OutputValue' \
    --output text \
    --region "$REGION" 2>/dev/null)

if [ -z "$DB_ENDPOINT" ]; then
    echo "❌ Could not get RDS endpoint. Make sure RDS is deployed first."
    exit 1
fi

echo "✅ RDS Endpoint: $DB_ENDPOINT"

# Get ECS cluster information to find an EC2 instance
CLUSTER_NAME="testdriven-${ENVIRONMENT}-cluster"
echo "📡 Finding EC2 instance in ECS cluster..."

# Get container instance ARN
CONTAINER_INSTANCE_ARN=$(aws ecs list-container-instances \
    --cluster "$CLUSTER_NAME" \
    --query 'containerInstanceArns[0]' \
    --output text \
    --region "$REGION")

if [ "$CONTAINER_INSTANCE_ARN" = "None" ] || [ -z "$CONTAINER_INSTANCE_ARN" ]; then
    echo "❌ No container instances found in cluster $CLUSTER_NAME"
    exit 1
fi

# Get EC2 instance ID
INSTANCE_ID=$(aws ecs describe-container-instances \
    --cluster "$CLUSTER_NAME" \
    --container-instances "$CONTAINER_INSTANCE_ARN" \
    --query 'containerInstances[0].ec2InstanceId' \
    --output text \
    --region "$REGION")

# Get public IP
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids "$INSTANCE_ID" \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text \
    --region "$REGION")

echo "✅ Found EC2 instance: $INSTANCE_ID"
echo "✅ Public IP: $PUBLIC_IP"

# SSH key path
KEY_PATH="~/.ssh/testdriven-${ENVIRONMENT}-key.pem"

echo ""
echo "🔗 Connection Information:"
echo "   RDS Endpoint: $DB_ENDPOINT"
echo "   Database: users_${ENVIRONMENT}"
echo "   Username: webapp"
echo "   EC2 Instance: $PUBLIC_IP"
echo "   SSH Key: $KEY_PATH"
echo ""
echo "📝 Connection Methods:"
echo ""
echo "1. SSH Tunnel (recommended):"
echo "   ssh -i $KEY_PATH -L 5432:$DB_ENDPOINT:5432 ec2-user@$PUBLIC_IP"
echo "   Then connect to: postgresql://webapp@localhost:5432/users_${ENVIRONMENT}"
echo ""
echo "2. Direct SSH + psql:"
echo "   ssh -i $KEY_PATH ec2-user@$PUBLIC_IP"
echo "   sudo yum install -y postgresql"
echo "   psql -h $DB_ENDPOINT -U webapp -d users_${ENVIRONMENT}"
echo ""
echo "3. Using Docker on EC2 instance:"
echo "   ssh -i $KEY_PATH ec2-user@$PUBLIC_IP"
echo "   docker run -it --rm postgres:15 psql -h $DB_ENDPOINT -U webapp -d users_${ENVIRONMENT}"
echo ""
echo "⚠️  Note: You'll need the database password to connect"
