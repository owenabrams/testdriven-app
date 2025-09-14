#!/bin/bash

# Run database migrations on ECS
# Usage: ./scripts/run-migrations.sh [staging|production]

set -e

ENVIRONMENT=${1:-staging}
REGION=${AWS_DEFAULT_REGION:-us-east-1}
CLUSTER_NAME="testdriven-${ENVIRONMENT}-cluster"

echo "🗃️  Running database migrations for ${ENVIRONMENT} environment..."

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

# Get the users service tasks
echo "📡 Finding running tasks..."
TASKS=$(aws ecs list-tasks \
    --cluster "$CLUSTER_NAME" \
    --service-name "testdriven-users-${ENVIRONMENT}-service" \
    --query 'taskArns[0]' \
    --output text \
    --region "$REGION")

if [ "$TASKS" = "None" ] || [ -z "$TASKS" ]; then
    echo "❌ No running tasks found for users service"
    exit 1
fi

echo "✅ Found task: $TASKS"

# Get task details
TASK_DETAIL=$(aws ecs describe-tasks \
    --cluster "$CLUSTER_NAME" \
    --tasks "$TASKS" \
    --region "$REGION")

# Get the EC2 instance ID
CONTAINER_INSTANCE_ARN=$(echo "$TASK_DETAIL" | jq -r '.tasks[0].containerInstanceArn')
INSTANCE_ID=$(aws ecs describe-container-instances \
    --cluster "$CLUSTER_NAME" \
    --container-instances "$CONTAINER_INSTANCE_ARN" \
    --query 'containerInstances[0].ec2InstanceId' \
    --output text \
    --region "$REGION")

echo "✅ Found EC2 instance: $INSTANCE_ID"

# Get the public IP
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids "$INSTANCE_ID" \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text \
    --region "$REGION")

echo "✅ Instance public IP: $PUBLIC_IP"

# Get the container ID for the users container
echo "📡 Getting container information..."
echo ""
echo "🔧 To run migrations manually:"
echo "1. SSH into the EC2 instance:"
echo "   ssh -i ~/.ssh/testdriven-${ENVIRONMENT}-key.pem ec2-user@${PUBLIC_IP}"
echo ""
echo "2. Find the users container:"
echo "   docker ps | grep users"
echo ""
echo "3. Execute migrations:"
echo "   docker exec -it <CONTAINER_ID> bash"
echo "   python manage.py recreate_db"
echo "   python manage.py seed_db"
echo ""
echo "🤖 Attempting automatic migration via ECS Exec (if enabled)..."

# Try to run migrations using ECS Exec (requires ECS Exec to be enabled)
if aws ecs execute-command \
    --cluster "$CLUSTER_NAME" \
    --task "$TASKS" \
    --container "users" \
    --interactive \
    --command "python manage.py recreate_db && python manage.py seed_db" \
    --region "$REGION" 2>/dev/null; then
    echo "✅ Migrations completed successfully!"
else
    echo "⚠️  ECS Exec not available. Please run migrations manually using the instructions above."
fi
