#!/bin/bash

# Deploy ECS production with RDS integration
# Usage: ./scripts/deploy-ecs-production.sh [db-password] [secret-key]

set -e

ENVIRONMENT="production"
REGION=${AWS_DEFAULT_REGION:-us-east-1}
CLUSTER_NAME="testdriven-${ENVIRONMENT}-cluster"
DB_PASSWORD=${1}
SECRET_KEY=${2}

echo "🚀 Deploying ECS production with RDS integration..."

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

# Check required parameters
if [ -z "$DB_PASSWORD" ] || [ -z "$SECRET_KEY" ]; then
    echo "❌ Database password and secret key are required."
    echo "Usage: $0 [db-password] [secret-key]"
    echo "Example: $0 MySecurePassword123! MySecretKey456!"
    exit 1
fi

# Get AWS Account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "✅ Using AWS Account: $AWS_ACCOUNT_ID"

# Get RDS endpoint
echo "📡 Getting RDS endpoint..."
RDS_STACK_NAME="testdriven-${ENVIRONMENT}-rds"
DB_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name "$RDS_STACK_NAME" \
    --query 'Stacks[0].Outputs[?OutputKey==`DBEndpoint`].OutputValue' \
    --output text \
    --region "$REGION")

if [ -z "$DB_ENDPOINT" ]; then
    echo "❌ Could not get RDS endpoint. Make sure RDS is deployed first:"
    echo "   ./scripts/deploy-rds.sh production [db-password]"
    exit 1
fi

echo "✅ RDS Endpoint: $DB_ENDPOINT"

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "❌ jq is required but not installed. Please install jq first."
    exit 1
fi

JQ="jq --raw-output --exit-status"

configure_aws_cli() {
    aws --version
    aws configure set default.region $REGION
    aws configure set default.output json
    echo "✅ AWS CLI configured for region $REGION"
}

register_definition() {
    echo "📝 Registering task definition..."
    if revision=$(aws ecs register-task-definition --cli-input-json "$task_def" | $JQ '.taskDefinition.taskDefinitionArn'); then
        echo "✅ Revision: $revision"
    else
        echo "❌ Failed to register task definition"
        return 1
    fi
}

update_service() {
    echo "🔄 Updating service: $service"
    if [[ $(aws ecs update-service --cluster $cluster --service $service --task-definition $revision | $JQ '.service.taskDefinition') != $revision ]]; then
        echo "❌ Error updating service."
        return 1
    else
        echo "✅ Service $service updated successfully"
    fi
}

wait_for_deployment() {
    echo "⏳ Waiting for deployment to complete..."
    aws ecs wait services-stable --cluster $cluster --services $service
    echo "✅ Deployment completed for $service"
}

deploy_cluster() {
    cluster="testdriven-${ENVIRONMENT}-cluster"

    echo ""
    echo "🔧 Deploying Users Service (with RDS)..."
    service="testdriven-users-${ENVIRONMENT}-service"
    template="ecs_users_prod_taskdefinition.json"
    task_template=$(cat "ecs/$template")
    task_def=$(printf "$task_template" $AWS_ACCOUNT_ID $DB_PASSWORD $DB_ENDPOINT $SECRET_KEY $AWS_ACCOUNT_ID $AWS_ACCOUNT_ID)
    echo "📋 Task definition prepared with RDS endpoint"
    register_definition
    update_service
    wait_for_deployment

    echo ""
    echo "🔧 Deploying Client Service..."
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
configure_aws_cli
deploy_cluster

echo ""
echo "🎉 ECS production deployment completed!"
echo "📋 Cluster: $CLUSTER_NAME"
echo "🗃️  Database: RDS PostgreSQL at $DB_ENDPOINT"
echo ""
echo "📝 Next steps:"
echo "1. Check ECS Console to verify services are running"
echo "2. Check ALB target groups for healthy instances"
echo "3. Test the application endpoints"
echo "4. Run database migrations if needed"
