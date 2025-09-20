# 🚀 Quick Deployment Reference Card

## Production URL (WORKING)
**http://testdriven-production-alb-1003393901.us-east-1.elb.amazonaws.com**

## One-Command Deployments

```bash
# Frontend only (most common)
./scripts/deploy-manual.sh frontend

# Backend only
./scripts/deploy-manual.sh backend

# Both services
./scripts/deploy-manual.sh

# Verify health
./scripts/deploy-manual.sh --verify frontend
```

## Prerequisites Check
```bash
# AWS authenticated?
aws sts get-caller-identity

# ECR login
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 068561046929.dkr.ecr.us-east-1.amazonaws.com

# Script executable?
chmod +x scripts/deploy-manual.sh
```

## Health Checks
```bash
# Frontend
curl -I http://testdriven-production-alb-1003393901.us-east-1.elb.amazonaws.com

# Backend API
curl http://testdriven-production-alb-1003393901.us-east-1.elb.amazonaws.com/ping

# Database (via API)
curl http://testdriven-production-alb-1003393901.us-east-1.elb.amazonaws.com/users
```

## Emergency Commands
```bash
# Service status
aws ecs describe-services --cluster testdriven-production-cluster --services testdriven-client-production-service --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount}'

# Target health
aws elbv2 describe-target-health --target-group-arn arn:aws:elasticloadbalancing:us-east-1:068561046929:targetgroup/testdriven-frontend-tg/038054e2e84012ab
```

## Critical Rules
1. ✅ Always use `--platform linux/amd64` for Docker builds
2. ✅ Use manual deployment when CI/CD fails
3. ✅ Never modify nginx to proxy to backend (ALB handles routing)
4. ✅ Test after every deployment

## Success Indicators
- ✅ HTTP 200 from frontend URL
- ✅ JSON response from /ping endpoint
- ✅ User data from /users endpoint
- ✅ ECS services showing 1/1 running
- ✅ Target groups showing healthy
