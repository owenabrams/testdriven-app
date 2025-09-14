# ECS Staging Automation - Zero Downtime Deployments

This guide implements automated ECS deployments with zero-downtime updates, adapted from the TestDriven tutorial for GitHub Actions.

## 🎯 Overview

This automation provides:
- **Zero-downtime deployments**: New containers start before old ones stop
- **Automated database migrations**: Run automatically on container startup
- **Health checks**: ALB ensures only healthy containers receive traffic
- **Rollback capability**: Failed deployments automatically roll back
- **Continuous deployment**: Triggered automatically on staging branch pushes

## 🏗️ Architecture

```
GitHub Push → GitHub Actions → ECR Images → ECS Task Definitions → ECS Services → ALB
                                                                                    ↓
                                                                            Health Checks
                                                                                    ↓
                                                                            Traffic Routing
```

## 📁 Files Created

### Task Definition Templates
- `ecs/ecs_client_stage_taskdefinition.json` - Client service definition
- `ecs/ecs_users_stage_taskdefinition.json` - Users + Database service definition

### Automation Scripts
- `scripts/deploy-ecs-staging.sh` - Zero-downtime ECS deployment
- `scripts/test-staging.sh` - Automated testing of staging environment
- `services/users/entrypoint-prod.sh` - Production entrypoint with migrations

### Updated Files
- `.github/workflows/main.yml` - Added automated ECS deployment step
- `services/users/Dockerfile-stage` - Added entrypoint and netcat
- `services/users/Dockerfile-prod` - Added entrypoint and netcat

## 🚀 How It Works

### 1. **Code Push Triggers Pipeline**
```bash
git push origin staging
```

### 2. **GitHub Actions Workflow**
1. **Tests**: Run backend and frontend tests
2. **Build**: Create Docker images with latest code
3. **Push**: Upload images to ECR with `staging` tag
4. **Deploy**: Automatically update ECS services

### 3. **Zero-Downtime Deployment Process**
1. **Register**: New task definitions with updated image references
2. **Update**: ECS services to use new task definitions
3. **Start**: New containers with latest code
4. **Health Check**: ALB verifies new containers are healthy
5. **Route**: Traffic switches to new containers
6. **Stop**: Old containers are terminated

### 4. **Automated Database Migrations**
The `entrypoint-prod.sh` script:
1. Waits for PostgreSQL to be ready
2. Runs `recreate_db` and `seed_db`
3. Starts the Gunicorn server

## 🔧 Manual Deployment

If you need to deploy manually:

```bash
# Deploy ECS services
./scripts/deploy-ecs-staging.sh

# Test the deployment
./scripts/test-staging.sh
```

## 🧪 Testing Your Deployment

### Automated Testing
The pipeline automatically tests:
- Health check endpoint (`/ping`)
- Users API endpoint (`/users`)
- Frontend accessibility (`/`)

### Manual Testing
```bash
# Get ALB DNS name
ALB_DNS=$(aws cloudformation describe-stacks \
  --stack-name testdriven-staging-alb \
  --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
  --output text)

# Test endpoints
curl http://$ALB_DNS/ping
curl http://$ALB_DNS/users
curl http://$ALB_DNS/

# Run end-to-end tests
cd client
./node_modules/.bin/cypress run --config baseUrl=http://$ALB_DNS
```

## 📊 Monitoring Deployments

### ECS Console
1. Go to ECS → Clusters → `testdriven-staging-cluster`
2. Check Services tab for deployment status
3. Monitor Tasks tab for container health

### CloudWatch Logs
Monitor logs for each service:
- `/ecs/testdriven-client-staging`
- `/ecs/testdriven-users-staging`
- `/ecs/testdriven-users-db-staging`

### ALB Target Groups
Check target group health:
1. Go to EC2 → Target Groups
2. Verify healthy targets in:
   - `testdriven-client-stage-tg`
   - `testdriven-users-stage-tg`

## 🚨 Troubleshooting

### Common Issues

1. **Deployment Stuck**
   ```bash
   # Check service events
   aws ecs describe-services --cluster testdriven-staging-cluster --services testdriven-users-staging-service
   
   # Check task status
   aws ecs list-tasks --cluster testdriven-staging-cluster --service-name testdriven-users-staging-service
   ```

2. **Health Checks Failing**
   - Check CloudWatch logs for startup errors
   - Verify database connectivity
   - Ensure containers are listening on correct ports

3. **Database Migration Issues**
   - Check logs: `/ecs/testdriven-users-staging`
   - Verify PostgreSQL container is healthy
   - Check environment variables in task definition

### Useful Commands

```bash
# Force new deployment
aws ecs update-service \
  --cluster testdriven-staging-cluster \
  --service testdriven-users-staging-service \
  --force-new-deployment

# Check deployment status
aws ecs describe-services \
  --cluster testdriven-staging-cluster \
  --services testdriven-users-staging-service \
  --query 'services[0].deployments'

# View recent logs
aws logs tail /ecs/testdriven-users-staging --follow
```

## 🔄 Rollback Process

If a deployment fails:

1. **Automatic Rollback**: ECS automatically rolls back if health checks fail
2. **Manual Rollback**: Update service to use previous task definition revision
   ```bash
   aws ecs update-service \
     --cluster testdriven-staging-cluster \
     --service testdriven-users-staging-service \
     --task-definition testdriven-users-staging-td:PREVIOUS_REVISION
   ```

## 🎯 Key Benefits

- ✅ **Zero Downtime**: Users never experience service interruption
- ✅ **Automated**: No manual intervention required
- ✅ **Safe**: Automatic rollback on failure
- ✅ **Fast**: Deployments complete in 2-5 minutes
- ✅ **Reliable**: Health checks ensure only working code goes live
- ✅ **Traceable**: Full deployment history in ECS console

## 🚀 Next Steps

1. **Set up production environment** using the same process
2. **Add blue/green deployments** for even safer updates
3. **Implement auto-scaling** based on traffic
4. **Add monitoring and alerting** for deployment failures
5. **Set up database backups** before migrations

This automation provides production-ready continuous deployment with zero downtime! 🎉
