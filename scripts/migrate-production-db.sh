#!/bin/bash

# Run production database migrations
# Usage: ./scripts/migrate-production-db.sh

set -e

ENVIRONMENT="production"
REGION=${AWS_DEFAULT_REGION:-us-east-1}
CLUSTER_NAME="testdriven-${ENVIRONMENT}-cluster"

echo "🗃️  Running production database migrations..."

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
    echo "📋 Make sure ECS services are deployed first:"
    echo "   ./scripts/deploy-ecs-production.sh [db-password] [secret-key]"
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

# SSH key path
KEY_PATH="~/.ssh/testdriven-${ENVIRONMENT}-key.pem"

echo ""
echo "🔧 Manual Migration Steps:"
echo "1. SSH into the EC2 instance:"
echo "   ssh -i $KEY_PATH ec2-user@$PUBLIC_IP"
echo ""
echo "2. Find the users container:"
echo "   docker ps | grep users"
echo ""
echo "3. Execute migrations:"
echo "   docker exec -it <CONTAINER_ID> bash"
echo "   python manage.py recreate_db"
echo "   python manage.py seed_db"
echo ""
echo "4. Verify the migration:"
echo "   python manage.py db current"
echo ""
echo "🔗 Alternative: Use RDS connection script for direct access:"
echo "   ./scripts/connect-rds.sh production"
echo ""
echo "⚠️  Important Notes:"
echo "   - Production uses RDS, not containerized PostgreSQL"
echo "   - Migrations only need to be run once per deployment"
echo "   - Database data persists between container restarts"
