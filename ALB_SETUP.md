# Application Load Balancer Setup Guide

This guide will help you set up an Application Load Balancer (ALB) for your TestDriven application, adapted for GitHub Actions instead of Travis CI.

## 🎯 Overview

The ALB will:
- Distribute traffic between your frontend (React) and backend (Flask API)
- Provide path-based routing (`/users*`, `/auth*` → API, everything else → React)
- Enable zero-downtime deployments
- Support automatic scaling and health checks

## 🚀 Quick Setup (Automated)

### Option 1: Using CloudFormation (Recommended)

1. **Deploy the ALB infrastructure:**
   ```bash
   ./scripts/deploy-alb.sh staging
   ```

2. **Get the ALB DNS name from the output and add it to GitHub Secrets:**
   - Go to GitHub → Settings → Secrets and variables → Actions
   - Add secret: `LOAD_BALANCER_STAGE_DNS_NAME` = `http://your-alb-dns-name`

3. **Commit and push your changes to trigger the updated pipeline**

### Option 2: Manual Setup via AWS Console

1. **Create Application Load Balancer:**
   - Navigate to EC2 → Load Balancers → Create Load Balancer
   - Select "Application Load Balancer"
   - Name: `testdriven-staging-alb`
   - Scheme: `internet-facing`
   - Listeners: HTTP / Port 80
   - Select default VPC and at least 2 subnets

2. **Create Security Group:**
   - Name: `testdriven-security-group`
   - Allow inbound: HTTP (80), HTTPS (443)

3. **Create Target Groups:**
   
   **Client Target Group:**
   - Name: `testdriven-client-stage-tg`
   - Target type: `IP` (for ECS Fargate)
   - Port: `80`
   - Health check path: `/`
   
   **Users API Target Group:**
   - Name: `testdriven-users-stage-tg`
   - Target type: `IP` (for ECS Fargate)
   - Port: `5000`
   - Health check path: `/ping`

4. **Configure Listener Rules:**
   - Default rule: Forward to `testdriven-client-stage-tg`
   - Add rule: If path is `/users*` OR `/auth*` → Forward to `testdriven-users-stage-tg`

5. **Add ALB DNS to GitHub Secrets:**
   - Copy the ALB DNS name from the Load Balancer details
   - Add to GitHub Secrets as `LOAD_BALANCER_STAGE_DNS_NAME`

## 📋 What Changed in Your Pipeline

### GitHub Actions Workflow Updates

Your `.github/workflows/main.yml` now includes:

1. **Environment-specific ALB DNS names:**
   ```yaml
   - name: Set environment variables
     run: |
       if [[ $GITHUB_REF == 'refs/heads/production' ]]; then
         echo "REACT_APP_USERS_SERVICE_URL=${{ secrets.LOAD_BALANCER_PROD_DNS_NAME }}" >> $GITHUB_ENV
       else
         echo "REACT_APP_USERS_SERVICE_URL=${{ secrets.LOAD_BALANCER_STAGE_DNS_NAME }}" >> $GITHUB_ENV
       fi
   ```

2. **Frontend build with ALB URL:**
   ```yaml
   - name: Build and push frontend image
     run: |
       docker build ./client -t testdriven-frontend:$COMMIT_SHORT -f ./client/Dockerfile-$DOCKER_ENV \
         --build-arg REACT_APP_USERS_SERVICE_URL=$REACT_APP_USERS_SERVICE_URL
   ```

### Frontend Docker Images

Your React app will now be built with the correct API endpoint:
- **Staging**: Points to your staging ALB
- **Production**: Points to your production ALB

## 🔧 Required GitHub Secrets

Add these secrets to your GitHub repository:

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `LOAD_BALANCER_STAGE_DNS_NAME` | Staging ALB DNS | `http://testdriven-staging-alb-123.us-east-1.elb.amazonaws.com` |
| `LOAD_BALANCER_PROD_DNS_NAME` | Production ALB DNS | `http://testdriven-prod-alb-456.us-east-1.elb.amazonaws.com` |

## 🏗️ Architecture

```
Internet → ALB → Target Groups → ECS Services
                ├── /users*, /auth* → Users API (Port 5000)
                └── /* (default) → React App (Port 80)
```

## 🧪 Testing the Setup

1. **Deploy the ALB** using one of the methods above
2. **Push changes** to your staging branch
3. **Verify the pipeline** builds and pushes images with the correct environment variables
4. **Check the ALB** in AWS Console to see the target groups and rules

## 🚀 Next Steps

After setting up the ALB:

1. **Deploy ECS Services** that register with these target groups
2. **Set up SSL/TLS certificates** for HTTPS (optional)
3. **Configure custom domain names** (optional)
4. **Set up production ALB** following the same process

## 🔍 Troubleshooting

### Common Issues:

1. **"No healthy targets"**: Check that your ECS services are running and health checks are passing
2. **404 errors**: Verify listener rules are configured correctly
3. **CORS issues**: Ensure your API allows requests from the ALB domain

### Useful Commands:

```bash
# Check ALB status
aws elbv2 describe-load-balancers --names testdriven-staging-alb

# Check target group health
aws elbv2 describe-target-health --target-group-arn <target-group-arn>

# View CloudFormation stack
aws cloudformation describe-stacks --stack-name testdriven-staging-alb
```

## 📚 Resources

- [AWS Application Load Balancer Documentation](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/)
- [ECS Service Load Balancing](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-load-balancing.html)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
