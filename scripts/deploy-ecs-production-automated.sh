#!/bin/bash

# Automated ECS production deployment for GitHub Actions
# Adapted from TestDriven tutorial for 3-service architecture

set -e

ENVIRONMENT="production"
REGION=${AWS_DEFAULT_REGION:-us-east-1}
CLUSTER_NAME="testdriven-${ENVIRONMENT}-cluster"

echo "🚀 Automated ECS Production Deployment"
echo "======================================"

# Check if this is a pull request
if [ "$GITHUB_EVENT_NAME" = "pull_request" ]; then
    echo "⏭️  Skipping deployment for pull request"
    exit 0
fi

# Check if this is production branch
if [ "$GITHUB_REF" != "refs/heads/production" ]; then
    echo "⏭️  Skipping deployment - not production branch"
    exit 0
fi

# Check required environment variables
if [ -z "$AWS_RDS_URI" ] || [ -z "$PRODUCTION_SECRET_KEY" ]; then
    echo "❌ Missing required environment variables:"
    echo "   - AWS_RDS_URI: ${AWS_RDS_URI:+SET}"
    echo "   - PRODUCTION_SECRET_KEY: ${PRODUCTION_SECRET_KEY:+SET}"
    exit 1
fi

# Get AWS Account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "✅ Using AWS Account: $AWS_ACCOUNT_ID"

# JQ for JSON processing
JQ="jq --raw-output --exit-status"

configure_aws_cli() {
    aws --version
    aws configure set default.region $REGION
    aws configure set default.output json
    echo "✅ AWS CLI configured for region $REGION"
}

register_definition() {
    echo "📝 Registering task definition for $service..."
    if revision=$(aws ecs register-task-definition --cli-input-json "$task_def" | $JQ '.taskDefinition.taskDefinitionArn'); then
        echo "✅ Revision: $revision"
    else
        echo "❌ Failed to register task definition for $service"
        return 1
    fi
}

update_service() {
    echo "🔄 Checking if service exists: $service"

    # Check if service exists
    if aws ecs describe-services --cluster $cluster --services $service --query 'services[0].status' --output text 2>/dev/null | grep -q "ACTIVE\|RUNNING\|PENDING"; then
        echo "✅ Service exists, updating: $service"
        if [[ $(aws ecs update-service --cluster $cluster --service $service --task-definition $revision | $JQ '.service.taskDefinition') != $revision ]]; then
            echo "❌ Error updating service $service"
            return 1
        else
            echo "✅ Service $service updated successfully"
        fi
    else
        echo "🔧 Service doesn't exist, creating: $service"
        # Convert comma-separated subnets to array format for AWS CLI
        SUBNET_ARRAY=$(echo $SUBNET_IDS | sed 's/,/","/g' | sed 's/^/"/' | sed 's/$/"/')

        aws ecs create-service \
            --cluster $cluster \
            --service-name $service \
            --task-definition $revision \
            --desired-count 1 \
            --launch-type FARGATE \
            --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_ARRAY],securityGroups=[\"$SECURITY_GROUP_ID\"],assignPublicIp=ENABLED}"

        if [ $? -eq 0 ]; then
            echo "✅ Service $service created successfully"
        else
            echo "❌ Error creating service $service"
            return 1
        fi
    fi
}

wait_for_deployment() {
    echo "⏳ Waiting for deployment to complete for $service..."
    aws ecs wait services-stable --cluster $cluster --services $service
    echo "✅ Deployment completed for $service"
}

deploy_cluster() {
    cluster="testdriven-${ENVIRONMENT}-cluster"

    echo ""
    echo "🏗️  Creating ECS cluster: $cluster"

    # Check if cluster exists
    if aws ecs describe-clusters --clusters $cluster --query 'clusters[0].status' --output text 2>/dev/null | grep -q "ACTIVE"; then
        echo "✅ Cluster $cluster already exists and is active"
    else
        echo "🔧 Creating new ECS cluster: $cluster"
        aws ecs create-cluster --cluster-name $cluster
        echo "✅ Cluster $cluster created successfully"
    fi

    echo ""
    echo "🔧 Setting up network infrastructure..."

    # Get default VPC and subnets
    VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query 'Vpcs[0].VpcId' --output text)
    SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query 'Subnets[0:2].SubnetId' --output text | tr '\t' ',')

    echo "✅ Using VPC: $VPC_ID"
    echo "✅ Using subnets: $SUBNET_IDS"

    # Create security group for ECS tasks
    SG_NAME="testdriven-${ENVIRONMENT}-ecs-tasks-sg"
    SECURITY_GROUP_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=$SG_NAME" --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null)

    if [ "$SECURITY_GROUP_ID" = "None" ] || [ -z "$SECURITY_GROUP_ID" ]; then
        echo "🔧 Creating security group: $SG_NAME"
        SECURITY_GROUP_ID=$(aws ec2 create-security-group \
            --group-name "$SG_NAME" \
            --description "Security group for ECS tasks in $ENVIRONMENT" \
            --vpc-id "$VPC_ID" \
            --query 'GroupId' --output text)

        # Add inbound rules
        aws ec2 authorize-security-group-ingress \
            --group-id "$SECURITY_GROUP_ID" \
            --protocol tcp \
            --port 80 \
            --cidr 0.0.0.0/0

        aws ec2 authorize-security-group-ingress \
            --group-id "$SECURITY_GROUP_ID" \
            --protocol tcp \
            --port 5000 \
            --cidr 0.0.0.0/0

        echo "✅ Security group created: $SECURITY_GROUP_ID"
    else
        echo "✅ Security group already exists: $SECURITY_GROUP_ID"
    fi

    echo ""
    echo "🔧 Deploying Backend Service (Users API with RDS)..."
    service="testdriven-users-${ENVIRONMENT}-service"
    template="ecs_users_prod_taskdefinition.json"
    task_template=$(cat "ecs/$template")
    # Parse RDS URI to extract password and endpoint
    # Expected format: postgresql://webapp:PASSWORD@ENDPOINT:5432/users_production
    RDS_PASSWORD=$(echo "$AWS_RDS_URI" | sed -n 's/.*:\/\/webapp:\([^@]*\)@.*/\1/p')
    RDS_ENDPOINT=$(echo "$AWS_RDS_URI" | sed -n 's/.*@\([^:]*\):.*/\1/p')

    echo "🔍 Debug: RDS_PASSWORD=${RDS_PASSWORD:0:5}... RDS_ENDPOINT=$RDS_ENDPOINT"

    task_def=$(printf "$task_template" $AWS_ACCOUNT_ID $RDS_PASSWORD $RDS_ENDPOINT $PRODUCTION_SECRET_KEY $AWS_ACCOUNT_ID $AWS_ACCOUNT_ID)
    echo "📋 Task definition prepared with RDS connection"
    register_definition
    update_service
    wait_for_deployment

    echo ""
    echo "🔧 Deploying Frontend Service (React Client)..."
    service="testdriven-client-${ENVIRONMENT}-service"
    template="ecs_client_prod_taskdefinition.json"
    task_template=$(cat "ecs/$template")
    task_def=$(printf "$task_template" $AWS_ACCOUNT_ID $AWS_ACCOUNT_ID $AWS_ACCOUNT_ID)
    echo "📋 Task definition prepared"
    register_definition
    update_service
    wait_for_deployment
}

# Main execution
echo "🔧 Configuring AWS CLI..."
configure_aws_cli

echo "🚀 Starting cluster deployment..."
deploy_cluster

echo ""
echo "🎉 Automated Production Deployment Complete!"
echo "============================================="
echo "📋 Cluster: $CLUSTER_NAME"
echo "🗃️  Database: RDS PostgreSQL"
echo "🌐 Services Deployed:"
echo "   - Frontend Service (testdriven-client-${ENVIRONMENT}-service)"
echo "   - Backend Service (testdriven-users-${ENVIRONMENT}-service)"
echo ""
echo "📝 Next Steps:"
echo "1. Check ECS Console to verify services are running"
echo "2. Check ALB target groups for healthy instances"
echo "3. Test the application endpoints"
echo "4. Run end-to-end tests"
