# ECS (Elastic Container Service) Setup Guide

This guide will help you set up ECS for your TestDriven application, adapted for GitHub Actions and your monolithic architecture.

## 🎯 Overview

ECS will orchestrate your Docker containers with:
- **Task Definitions**: Blueprints for your containers (like docker-compose)
- **Cluster**: Group of EC2 instances running your containers
- **Services**: Ensure desired number of tasks are always running
- **Integration**: Automatic registration with your ALB target groups

## 🏗️ Architecture

```
ECS Cluster (EC2 instances)
├── Client Service (React app) → ALB Client Target Group
├── Users Service (Flask API + PostgreSQL) → ALB Users Target Group
└── Auto Scaling Group (1-3 instances)
```

## 🚀 Quick Setup (Automated)

### Prerequisites

1. **ALB must be deployed first:**
   ```bash
   ./scripts/deploy-alb.sh staging
   ```

2. **ECR repositories must exist with images:**
   - Push to staging branch to trigger image builds
   - Verify images exist in ECR console

### Deploy ECS Infrastructure

```bash
./scripts/deploy-ecs.sh staging
```

This will:
- ✅ Create ECS Task Definitions for client and users services
- ✅ Create ECS Cluster with Auto Scaling Group (2 t3.micro instances)
- ✅ Create ECS Services that register with ALB target groups
- ✅ Set up CloudWatch logging for all containers
- ✅ Create EC2 Key Pair for SSH access

## 📋 What Gets Created

### Task Definitions

**Client Task Definition** (`testdriven-client-staging-td`):
- Container: React app (port 80)
- Memory: 300MB
- Logs: CloudWatch `/ecs/testdriven-client-staging`

**Users Task Definition** (`testdriven-users-staging-td`):
- Container 1: PostgreSQL database (port 5432)
- Container 2: Flask API (port 5000)
- Memory: 300MB each
- Links: API container linked to database
- Logs: Separate CloudWatch log groups

### ECS Cluster

- **Name**: `testdriven-staging-cluster`
- **Type**: EC2 (not Fargate, following tutorial)
- **Instances**: 2 x t3.micro with Auto Scaling
- **Security**: SSH access + ALB traffic allowed

### ECS Services

- **Client Service**: 1 task, registers with client target group
- **Users Service**: 1 task, registers with users target group
- **Deployment**: Rolling updates with 50% minimum healthy

## 🗃️ Database Migrations

After ECS deployment, you need to run database migrations:

### Option 1: Automated Script
```bash
./scripts/run-migrations.sh staging
```

### Option 2: Manual Process

1. **Find the EC2 instance:**
   ```bash
   # Get cluster information
   aws ecs describe-clusters --clusters testdriven-staging-cluster
   
   # Get running tasks
   aws ecs list-tasks --cluster testdriven-staging-cluster --service-name testdriven-users-staging-service
   ```

2. **SSH into the instance:**
   ```bash
   ssh -i ~/.ssh/testdriven-staging-key.pem ec2-user@<PUBLIC_IP>
   ```

3. **Run migrations:**
   ```bash
   # Find the users container
   docker ps | grep users
   
   # Execute migrations
   docker exec -it <CONTAINER_ID> bash
   python manage.py recreate_db
   python manage.py seed_db
   ```

## 🧪 Testing Your Deployment

1. **Get ALB DNS name:**
   ```bash
   aws cloudformation describe-stacks \
     --stack-name testdriven-staging-alb \
     --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
     --output text
   ```

2. **Test endpoints:**
   ```bash
   # Health check
   curl http://<ALB_DNS>/ping
   
   # Users API
   curl http://<ALB_DNS>/users
   
   # Frontend
   curl http://<ALB_DNS>/
   ```

3. **Run end-to-end tests:**
   ```bash
   ./node_modules/.bin/cypress run --config baseUrl=http://<ALB_DNS>
   ```

## 🔧 Monitoring and Debugging

### CloudWatch Logs

View logs for each service:
- Client: `/ecs/testdriven-client-staging`
- Users API: `/ecs/testdriven-users-staging`
- Database: `/ecs/testdriven-users-db-staging`

### ECS Console

Monitor your services:
1. Go to ECS Console → Clusters → `testdriven-staging-cluster`
2. Check Services tab for running tasks
3. Check Tasks tab for individual container status

### Target Group Health

Check ALB target groups:
1. Go to EC2 Console → Target Groups
2. Verify instances are healthy in:
   - `testdriven-client-stage-tg`
   - `testdriven-users-stage-tg`

## 🚨 Troubleshooting

### Common Issues

1. **"No healthy targets"**
   - Check security group allows ALB traffic
   - Verify containers are listening on correct ports
   - Check CloudWatch logs for startup errors

2. **Tasks keep stopping**
   - Check CloudWatch logs for error messages
   - Verify ECR images exist and are accessible
   - Check task definition resource limits

3. **Can't connect to database**
   - Ensure database container starts before API container
   - Check container links in task definition
   - Verify environment variables

### Useful Commands

```bash
# Check cluster status
aws ecs describe-clusters --clusters testdriven-staging-cluster

# List running tasks
aws ecs list-tasks --cluster testdriven-staging-cluster

# Get task details
aws ecs describe-tasks --cluster testdriven-staging-cluster --tasks <TASK_ARN>

# Check service status
aws ecs describe-services --cluster testdriven-staging-cluster --services testdriven-users-staging-service

# View logs
aws logs get-log-events --log-group-name /ecs/testdriven-users-staging --log-stream-name <STREAM_NAME>
```

## 🔄 Updating Your Application

When you push changes to staging branch:
1. GitHub Actions builds new Docker images
2. Images are pushed to ECR with `staging` tag
3. **Manual step**: Update ECS service to use new images:
   ```bash
   aws ecs update-service \
     --cluster testdriven-staging-cluster \
     --service testdriven-users-staging-service \
     --force-new-deployment
   ```

## 🚀 Next Steps

After ECS is running:
1. **Set up continuous deployment** to automatically update ECS services
2. **Configure auto-scaling** based on CPU/memory usage
3. **Add HTTPS/SSL** to your ALB
4. **Set up production environment** following the same process
5. **Implement blue/green deployments** for zero-downtime updates

## 📚 Resources

- [Amazon ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [ECS Task Definitions](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definitions.html)
- [ECS Service Load Balancing](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-load-balancing.html)
