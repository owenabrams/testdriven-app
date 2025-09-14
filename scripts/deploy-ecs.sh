#!/bin/bash

# Deploy ECS infrastructure using CloudFormation
# Usage: ./scripts/deploy-ecs.sh [staging|production]

set -e

ENVIRONMENT=${1:-staging}
REGION=${AWS_DEFAULT_REGION:-us-east-1}

# Stack names
ALB_STACK_NAME="testdriven-${ENVIRONMENT}-alb"
TASK_DEF_STACK_NAME="testdriven-${ENVIRONMENT}-task-definitions"
CLUSTER_STACK_NAME="testdriven-${ENVIRONMENT}-cluster"

echo "🚀 Deploying ECS infrastructure for ${ENVIRONMENT} environment..."

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

# Get AWS Account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

echo "✅ Using AWS Account: $AWS_ACCOUNT_ID"
echo "✅ Using ECR Registry: $ECR_REGISTRY"

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

LOAD_BALANCER_ARN=$(echo "$ALB_OUTPUTS" | jq -r '.[] | select(.OutputKey=="LoadBalancerArn") | .OutputValue')
CLIENT_TARGET_GROUP_ARN=$(echo "$ALB_OUTPUTS" | jq -r '.[] | select(.OutputKey=="ClientTargetGroupArn") | .OutputValue')
USERS_TARGET_GROUP_ARN=$(echo "$ALB_OUTPUTS" | jq -r '.[] | select(.OutputKey=="UsersTargetGroupArn") | .OutputValue')
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query 'Vpcs[0].VpcId' --output text --region "$REGION")
SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query 'Subnets[].SubnetId' --output text --region "$REGION" | tr '\t' ',')

echo "✅ Load Balancer ARN: $LOAD_BALANCER_ARN"
echo "✅ Client Target Group ARN: $CLIENT_TARGET_GROUP_ARN"
echo "✅ Users Target Group ARN: $USERS_TARGET_GROUP_ARN"

# Check for EC2 Key Pair
KEY_PAIR_NAME="testdriven-${ENVIRONMENT}-key"
if ! aws ec2 describe-key-pairs --key-names "$KEY_PAIR_NAME" --region "$REGION" > /dev/null 2>&1; then
    echo "🔑 Creating EC2 Key Pair: $KEY_PAIR_NAME"
    aws ec2 create-key-pair \
        --key-name "$KEY_PAIR_NAME" \
        --query 'KeyMaterial' \
        --output text \
        --region "$REGION" > ~/.ssh/${KEY_PAIR_NAME}.pem
    chmod 400 ~/.ssh/${KEY_PAIR_NAME}.pem
    echo "✅ Key pair saved to ~/.ssh/${KEY_PAIR_NAME}.pem"
else
    echo "✅ Using existing key pair: $KEY_PAIR_NAME"
fi

# Deploy Task Definitions
echo "🏗️  Deploying ECS Task Definitions..."
aws cloudformation deploy \
    --template-file "infrastructure/ecs-task-definitions.yml" \
    --stack-name "$TASK_DEF_STACK_NAME" \
    --parameter-overrides \
        Environment="$ENVIRONMENT" \
        ECRRegistry="$ECR_REGISTRY" \
        ImageTag="$ENVIRONMENT" \
    --capabilities CAPABILITY_NAMED_IAM \
    --region "$REGION"

# Get Task Definition ARNs
echo "📡 Getting Task Definition ARNs..."
TASK_DEF_OUTPUTS=$(aws cloudformation describe-stacks \
    --stack-name "$TASK_DEF_STACK_NAME" \
    --query 'Stacks[0].Outputs' \
    --region "$REGION")

CLIENT_TASK_DEF_ARN=$(echo "$TASK_DEF_OUTPUTS" | jq -r '.[] | select(.OutputKey=="ClientTaskDefinitionArn") | .OutputValue')
USERS_TASK_DEF_ARN=$(echo "$TASK_DEF_OUTPUTS" | jq -r '.[] | select(.OutputKey=="UsersTaskDefinitionArn") | .OutputValue')

echo "✅ Client Task Definition ARN: $CLIENT_TASK_DEF_ARN"
echo "✅ Users Task Definition ARN: $USERS_TASK_DEF_ARN"

# Deploy ECS Cluster and Services
echo "🏗️  Deploying ECS Cluster and Services..."
aws cloudformation deploy \
    --template-file "infrastructure/ecs-cluster.yml" \
    --stack-name "$CLUSTER_STACK_NAME" \
    --parameter-overrides \
        Environment="$ENVIRONMENT" \
        VpcId="$VPC_ID" \
        SubnetIds="$SUBNET_IDS" \
        KeyPairName="$KEY_PAIR_NAME" \
        LoadBalancerArn="$LOAD_BALANCER_ARN" \
        ClientTargetGroupArn="$CLIENT_TARGET_GROUP_ARN" \
        UsersTargetGroupArn="$USERS_TARGET_GROUP_ARN" \
        ClientTaskDefinitionArn="$CLIENT_TASK_DEF_ARN" \
        UsersTaskDefinitionArn="$USERS_TASK_DEF_ARN" \
    --capabilities CAPABILITY_NAMED_IAM \
    --region "$REGION"

# Get cluster information
CLUSTER_NAME=$(aws cloudformation describe-stacks \
    --stack-name "$CLUSTER_STACK_NAME" \
    --query 'Stacks[0].Outputs[?OutputKey==`ClusterName`].OutputValue' \
    --output text \
    --region "$REGION")

echo ""
echo "🎉 ECS deployment complete!"
echo "📋 Cluster Name: $CLUSTER_NAME"
echo "🔑 SSH Key: ~/.ssh/${KEY_PAIR_NAME}.pem"
echo ""
echo "📝 Next steps:"
echo "1. Wait for EC2 instances to launch and register with the cluster"
echo "2. Check ECS Console to verify services are running"
echo "3. Test the application via the ALB DNS name"
echo "4. Run database migrations (see ECS_SETUP.md for instructions)"
