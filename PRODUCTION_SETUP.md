# ECS Production Setup Guide

This guide implements the complete ECS Production setup following the TestDriven tutorial, adapted for GitHub Actions and modern AWS practices.

## 🎯 Production Architecture

```
Internet → ALB → ECS Cluster (EC2) → RDS PostgreSQL
                 ├── Frontend Service (React)
                 └── Backend Service (Flask API)
```

## 🏗️ Infrastructure Components

### **1. Application Load Balancer (ALB)**
- **Name**: `testdriven-production-alb`
- **Scheme**: Internet-facing
- **Target Groups**:
  - `testdriven-client-prod-tg` (Port 80, Health: `/`)
  - `testdriven-users-prod-tg` (Port 5000, Health: `/ping`)
- **Routing Rules**:
  - `/users*`, `/auth*` → Backend API
  - `/*` → React Frontend

### **2. ECS Cluster**
- **Name**: `testdriven-production-cluster`
- **Launch Type**: EC2
- **Instance Type**: t3.micro (2 instances)
- **Auto Scaling**: Enabled
- **Key Pair**: `testdriven-production-key`

### **3. RDS Database**
- **Engine**: PostgreSQL 15.4
- **Instance**: db.t3.micro
- **Database**: `users_production`
- **Access**: Private (VPC only)
- **Backups**: 7 days retention
- **Monitoring**: Enhanced monitoring enabled

## 🚀 Deployment Process

### **Prerequisites**
1. **AWS CLI configured** with appropriate permissions
2. **GitHub repository** with staging branch working
3. **Production branch** created from staging
4. **GitHub Secrets configured** (see PRODUCTION_SECRETS_SETUP.md)

### **Option 1: Automated Deployment (Recommended)**
```bash
# Automatic deployment on push to production branch
git push origin production

# GitHub Actions will:
# 1. Run tests
# 2. Build and push Docker images
# 3. Update ECS task definitions
# 4. Deploy services with zero downtime
```

### **Option 2: Manual Deployment**

#### **Step 1: Deploy Infrastructure**
```bash
./scripts/deploy-production-complete.sh DB_PASSWORD SECRET_KEY
```

#### **Step 2: Deploy Services Only**
```bash
./scripts/deploy-ecs-production-automated.sh
```

#### **Step 3: Run Database Migrations**
```bash
./scripts/migrate-production-db.sh
```

## 📋 Task Definitions

### **Client Task Definition**
- **Name**: `testdriven-client-prod-td`
- **Image**: `ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/testdriven-client:production`
- **Memory**: 300MB soft limit
- **Port**: 80
- **Logs**: `testdriven-client-prod`

### **Users Task Definition**
- **Name**: `testdriven-users-prod-td`
- **Image**: `ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/testdriven-users:production`
- **Memory**: 512MB soft limit
- **Port**: 5000
- **Logs**: `testdriven-users-prod`
- **Environment Variables**:
  - `SECRET_KEY`: Production secret key
  - `APP_SETTINGS`: `project.config.ProductionConfig`
  - `DATABASE_URL`: RDS connection string

### **Swagger Task Definition**
- **Name**: `testdriven-swagger-prod-td`
- **Image**: `ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/testdriven-swagger:production`
- **Memory**: 300MB soft limit
- **Port**: 8080
- **Logs**: `testdriven-swagger-prod`

## 🔄 Key Differences from Staging

### **Database**
- **Staging**: Containerized PostgreSQL
- **Production**: Managed RDS PostgreSQL

### **Entrypoint Scripts**
- **Staging**: Uses `entrypoint-stage.sh` (waits for DB container)
- **Production**: Direct Gunicorn execution (no container dependencies)

### **Memory Allocation**
- **Staging**: 300MB for all services
- **Production**: 512MB for users service (better performance)

### **Deployment Strategy**
- **Staging**: Automated on every push
- **Production**: Manual deployment with validation steps

## 🔧 Production Configuration

### **Docker Configuration**
```dockerfile
# Production Dockerfile (no entrypoint script)
CMD ["gunicorn", "-b", "0.0.0.0:5000", "--workers", "3", "manage:app"]
```

### **Environment Variables**
```bash
SECRET_KEY=your-production-secret-key
APP_SETTINGS=project.config.ProductionConfig
DATABASE_URL=postgresql://webapp:PASSWORD@RDS_ENDPOINT:5432/users_production
```

## 🗃️ Database Management

### **Initial Setup**
```bash
# SSH into EC2 instance
ssh -i ~/.ssh/testdriven-production-key.pem ec2-user@EC2_PUBLIC_IP

# Find users container
docker ps | grep users

# Run migrations
docker exec -it CONTAINER_ID bash
python manage.py recreate_db
python manage.py seed_db
```

### **Database Access**
```bash
# Use connection helper
./scripts/connect-rds.sh production

# SSH tunnel method
ssh -i ~/.ssh/testdriven-production-key.pem -L 5432:RDS_ENDPOINT:5432 ec2-user@EC2_PUBLIC_IP
psql postgresql://webapp:PASSWORD@localhost:5432/users_production
```

## 🧪 Testing Production

### **Health Checks**
```bash
# Get ALB DNS name
ALB_DNS=$(aws cloudformation describe-stacks \
  --stack-name testdriven-production-alb \
  --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
  --output text)

# Test endpoints
curl http://$ALB_DNS/ping
curl http://$ALB_DNS/users
curl http://$ALB_DNS/swagger
```

### **End-to-End Tests**
```bash
# Run Cypress tests against production
./node_modules/.bin/cypress run --config baseUrl=http://$ALB_DNS
```

## 📊 Monitoring & Logging

### **CloudWatch Logs**
- `testdriven-client-prod`: React application logs
- `testdriven-users-prod`: Flask API logs
- `testdriven-swagger-prod`: Swagger UI logs

### **ECS Monitoring**
- Service health and task status
- CPU and memory utilization
- Container instance health

### **RDS Monitoring**
- Database performance metrics
- Connection count and query performance
- Automated backup status

## 🔒 Security Best Practices

### **Network Security**
- ✅ **Private RDS**: No public access
- ✅ **VPC Security Groups**: Restrictive access rules
- ✅ **ALB Security**: Only HTTP/HTTPS traffic allowed

### **Application Security**
- ✅ **Environment Variables**: Secrets not in code
- ✅ **Production Config**: Separate from development
- ✅ **Database Encryption**: At rest and in transit

### **Access Control**
- ✅ **IAM Roles**: Least privilege access
- ✅ **SSH Keys**: Separate keys for production
- ✅ **Database Credentials**: Strong passwords

## 🚨 Troubleshooting

### **Common Issues**

1. **Service Not Starting**
   - Check ECS service events
   - Verify task definition configuration
   - Check CloudWatch logs

2. **Database Connection Issues**
   - Verify RDS endpoint in environment variables
   - Check security group rules
   - Ensure RDS is in available state

3. **ALB Health Check Failures**
   - Verify target group health check paths
   - Check service port mappings
   - Ensure containers are responding

### **Useful Commands**
```bash
# Check ECS service status
aws ecs describe-services --cluster testdriven-production-cluster --services testdriven-users-prod-service

# View CloudWatch logs
aws logs tail testdriven-users-prod --follow

# Check RDS status
aws rds describe-db-instances --db-instance-identifier testdriven-production
```

## 💰 Cost Optimization

### **Free Tier Resources**
- ✅ **ECS**: No additional charges for ECS service
- ✅ **EC2**: t3.micro instances (750 hours/month free)
- ✅ **RDS**: db.t3.micro (750 hours/month free)
- ✅ **ALB**: 750 hours/month free

### **Cost Monitoring**
- Set up billing alerts
- Monitor usage in Cost Explorer
- Consider Reserved Instances for long-term use

## 🎯 Next Steps

1. **SSL/HTTPS**: Add SSL certificate to ALB
2. **Domain Name**: Configure Route 53 for custom domain
3. **CI/CD**: Automate production deployments
4. **Monitoring**: Set up CloudWatch alarms
5. **Backup Strategy**: Configure automated RDS snapshots

Production deployment is complete! Your TestDriven application is now running on a scalable, production-ready AWS infrastructure. 🎉
