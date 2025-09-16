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

    # Check if service exists with more robust detection
    SERVICE_STATUS=$(aws ecs describe-services --cluster $cluster --services $service --query 'services[0].status' --output text 2>/dev/null)
    SERVICE_EXISTS=$?

    if [ $SERVICE_EXISTS -eq 0 ] && [[ "$SERVICE_STATUS" =~ ^(ACTIVE|RUNNING|PENDING)$ ]]; then
        echo "✅ Service exists (status: $SERVICE_STATUS), updating: $service"

        # Update existing service
        UPDATE_RESULT=$(aws ecs update-service --cluster $cluster --service $service --task-definition $revision 2>&1)
        if [ $? -eq 0 ]; then
            UPDATED_REVISION=$(echo "$UPDATE_RESULT" | $JQ -r '.service.taskDefinition')
            if [[ "$UPDATED_REVISION" == *"$revision"* ]]; then
                echo "✅ Service $service updated successfully to revision $revision"
            else
                echo "⚠️  Service updated but revision mismatch. Expected: $revision, Got: $UPDATED_REVISION"
            fi
        else
            echo "❌ Error updating service $service: $UPDATE_RESULT"
            return 1
        fi
    else
        echo "🔧 Service doesn't exist or is inactive, creating: $service"

        # Convert comma-separated subnets to array format for AWS CLI
        SUBNET_ARRAY=$(echo $SUBNET_IDS | sed 's/,/","/g' | sed 's/^/"/' | sed 's/$/"/')

        # Attempt to create service with retry logic for idempotency errors
        CREATE_RESULT=$(aws ecs create-service \
            --cluster $cluster \
            --service-name $service \
            --task-definition $revision \
            --desired-count 1 \
            --launch-type FARGATE \
            --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_ARRAY],securityGroups=[\"$SECURITY_GROUP_ID\"],assignPublicIp=ENABLED}" 2>&1)

        CREATE_EXIT_CODE=$?

        if [ $CREATE_EXIT_CODE -eq 0 ]; then
            echo "✅ Service $service created successfully"
        elif echo "$CREATE_RESULT" | grep -q "Creation of service was not idempotent"; then
            echo "⚠️  Service creation idempotency error detected. Service may already exist in transitional state."
            echo "🔄 Waiting 10 seconds and checking service status..."
            sleep 10

            # Re-check service status after idempotency error
            SERVICE_STATUS_RETRY=$(aws ecs describe-services --cluster $cluster --services $service --query 'services[0].status' --output text 2>/dev/null)
            if [[ "$SERVICE_STATUS_RETRY" =~ ^(ACTIVE|RUNNING|PENDING)$ ]]; then
                echo "✅ Service $service exists after idempotency error (status: $SERVICE_STATUS_RETRY)"
                echo "🔄 Updating service to ensure correct task definition..."

                # Force update to ensure correct task definition
                UPDATE_RESULT=$(aws ecs update-service --cluster $cluster --service $service --task-definition $revision --force-new-deployment 2>&1)
                if [ $? -eq 0 ]; then
                    echo "✅ Service $service updated successfully after idempotency resolution"
                else
                    echo "❌ Error updating service after idempotency error: $UPDATE_RESULT"
                    return 1
                fi
            else
                echo "❌ Service still not accessible after idempotency error"
                return 1
            fi
        else
            echo "❌ Error creating service $service: $CREATE_RESULT"
            return 1
        fi
    fi
}

wait_for_deployment() {
    echo "⏳ Waiting for deployment to complete for $service..."

    # Use timeout to prevent infinite waiting
    timeout 600 aws ecs wait services-stable --cluster $cluster --services $service
    WAIT_EXIT_CODE=$?

    if [ $WAIT_EXIT_CODE -eq 0 ]; then
        echo "✅ Deployment completed for $service"

        # Verify service is actually running
        RUNNING_COUNT=$(aws ecs describe-services --cluster $cluster --services $service --query 'services[0].runningCount' --output text)
        DESIRED_COUNT=$(aws ecs describe-services --cluster $cluster --services $service --query 'services[0].desiredCount' --output text)

        if [ "$RUNNING_COUNT" = "$DESIRED_COUNT" ] && [ "$RUNNING_COUNT" -gt 0 ]; then
            echo "✅ Service $service is healthy: $RUNNING_COUNT/$DESIRED_COUNT tasks running"
        else
            echo "⚠️  Service $service deployment completed but task counts don't match: $RUNNING_COUNT/$DESIRED_COUNT"
        fi
    elif [ $WAIT_EXIT_CODE -eq 124 ]; then
        echo "⚠️  Deployment wait timed out after 10 minutes for $service"
        echo "🔍 Checking current service status..."

        # Show current status even if wait timed out
        aws ecs describe-services --cluster $cluster --services $service --query 'services[0].{status:status,runningCount:runningCount,desiredCount:desiredCount,deployments:deployments[0].{status:status,rolloutState:rolloutState}}' --output table

        echo "⚠️  Continuing deployment despite timeout - service may still be stabilizing"
    else
        echo "❌ Error waiting for deployment of $service (exit code: $WAIT_EXIT_CODE)"

        # Show service events for debugging
        echo "🔍 Recent service events:"
        aws ecs describe-services --cluster $cluster --services $service --query 'services[0].events[0:3]' --output table

        return 1
    fi
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
    echo "🔧 Creating CloudWatch log groups..."

    # Create log groups for both services
    for log_group in "testdriven-users-prod" "testdriven-client-prod"; do
        if aws logs describe-log-groups --log-group-name-prefix "$log_group" --query 'logGroups[?logGroupName==`'$log_group'`]' --output text | grep -q "$log_group"; then
            echo "✅ Log group already exists: $log_group"
        else
            echo "🔧 Creating log group: $log_group"
            aws logs create-log-group --log-group-name "$log_group"
            echo "✅ Log group created: $log_group"
        fi
    done

    echo ""
    echo "🔧 Deploying Backend Service (Users API with RDS)..."
    service="testdriven-users-${ENVIRONMENT}-service"
    template="ecs_users_prod_taskdefinition.json"

    if [ ! -f "ecs/$template" ]; then
        echo "❌ Task definition template not found: ecs/$template"
        return 1
    fi

    task_template=$(cat "ecs/$template")

    # Parse RDS URI to extract password and endpoint
    # Expected format: postgresql://webapp:PASSWORD@ENDPOINT:5432/users_production
    RDS_PASSWORD=$(echo "$AWS_RDS_URI" | sed -n 's/.*:\/\/webapp:\([^@]*\)@.*/\1/p')
    RDS_ENDPOINT=$(echo "$AWS_RDS_URI" | sed -n 's/.*@\([^:]*\):.*/\1/p')

    if [ -z "$RDS_PASSWORD" ] || [ -z "$RDS_ENDPOINT" ]; then
        echo "❌ Failed to parse RDS credentials from AWS_RDS_URI"
        echo "🔍 RDS_URI format should be: postgresql://webapp:PASSWORD@ENDPOINT:5432/users_production"
        return 1
    fi

    echo "🔍 Debug: RDS_PASSWORD=${RDS_PASSWORD:0:5}... RDS_ENDPOINT=$RDS_ENDPOINT"

    task_def=$(printf "$task_template" $AWS_ACCOUNT_ID $RDS_PASSWORD $RDS_ENDPOINT $PRODUCTION_SECRET_KEY $AWS_ACCOUNT_ID $AWS_ACCOUNT_ID)
    echo "📋 Task definition prepared with RDS connection"

    if ! register_definition; then
        echo "❌ Failed to register backend task definition"
        return 1
    fi

    if ! update_service; then
        echo "❌ Failed to update backend service"
        return 1
    fi

    if ! wait_for_deployment; then
        echo "⚠️  Backend deployment may not be fully stable, but continuing..."
    fi

    echo ""
    echo "🔧 Deploying Frontend Service (React Client)..."
    service="testdriven-client-${ENVIRONMENT}-service"
    template="ecs_client_prod_taskdefinition.json"

    if [ ! -f "ecs/$template" ]; then
        echo "❌ Task definition template not found: ecs/$template"
        return 1
    fi

    task_template=$(cat "ecs/$template")
    task_def=$(printf "$task_template" $AWS_ACCOUNT_ID $AWS_ACCOUNT_ID $AWS_ACCOUNT_ID)
    echo "📋 Task definition prepared"

    if ! register_definition; then
        echo "❌ Failed to register frontend task definition"
        return 1
    fi

    if ! update_service; then
        echo "❌ Failed to update frontend service"
        return 1
    fi

    if ! wait_for_deployment; then
        echo "⚠️  Frontend deployment may not be fully stable, but continuing..."
    fi
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
echo "   - Backend Service (testdriven-users-${ENVIRONMENT}-service)"
echo "   - Frontend Service (testdriven-client-${ENVIRONMENT}-service)"
echo ""

# Final deployment verification
echo "🔍 Final Deployment Verification:"
echo "=================================="

BACKEND_SERVICE="testdriven-users-${ENVIRONMENT}-service"
FRONTEND_SERVICE="testdriven-client-${ENVIRONMENT}-service"

# Check backend service status
BACKEND_STATUS=$(aws ecs describe-services --cluster $CLUSTER_NAME --services $BACKEND_SERVICE --query 'services[0].{status:status,running:runningCount,desired:desiredCount}' --output json 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ Backend Service Status:"
    echo "$BACKEND_STATUS" | $JQ -r '"   Status: \(.status), Running: \(.running)/\(.desired) tasks"'
else
    echo "❌ Could not verify backend service status"
fi

# Check frontend service status
FRONTEND_STATUS=$(aws ecs describe-services --cluster $CLUSTER_NAME --services $FRONTEND_SERVICE --query 'services[0].{status:status,running:runningCount,desired:desiredCount}' --output json 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ Frontend Service Status:"
    echo "$FRONTEND_STATUS" | $JQ -r '"   Status: \(.status), Running: \(.running)/\(.desired) tasks"'
else
    echo "❌ Could not verify frontend service status"
fi

echo ""
echo "📝 Next Steps:"
echo "1. Check ECS Console to verify services are running"
echo "2. Check CloudWatch logs for any application errors"
echo "3. Test the application endpoints"
echo "4. Set up load balancer if needed for production traffic"
echo ""
echo "🔗 Useful commands:"
echo "   aws ecs describe-services --cluster $CLUSTER_NAME --services $BACKEND_SERVICE $FRONTEND_SERVICE"
echo "   aws logs tail testdriven-users-prod --follow"
echo "   aws logs tail testdriven-client-prod --follow"
