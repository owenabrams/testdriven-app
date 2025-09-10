# 🐳 Docker Deployment Guide - Savings Groups Platform

This guide covers containerizing and deploying the Savings Groups Platform using Docker and AWS services.

## 📋 Prerequisites

- Docker Desktop installed and running
- AWS CLI configured with appropriate permissions
- AWS account with ECR, ECS, and RDS access

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │────│   ECS Fargate   │────│   RDS Postgres  │
│   (ALB/CloudFr) │    │   (Container)   │    │   (Database)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start - Local Development

### 1. Start Local Environment
```bash
# Build and run all services locally
./scripts/docker-local.sh

# Or manually with docker-compose
docker-compose up --build
```

### 2. Access the Application
- **Frontend & API**: http://localhost:5000
- **Database**: localhost:5432 (postgres/password)

### 3. View Logs
```bash
docker-compose logs -f
```

### 4. Stop Services
```bash
docker-compose down
```

## ☁️ AWS Deployment

### 1. Build and Push to ECR
```bash
# Deploy to AWS ECR (Elastic Container Registry)
./scripts/docker-deploy.sh

# Or with custom tag
./scripts/docker-deploy.sh v1.0.0
```

### 2. Set Up AWS Infrastructure

#### Create RDS Database
```bash
aws rds create-db-instance \
  --db-instance-identifier savings-groups-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username postgres \
  --master-user-password YOUR_SECURE_PASSWORD \
  --allocated-storage 20 \
  --vpc-security-group-ids sg-xxxxxxxxx \
  --db-subnet-group-name default
```

#### Create ECS Cluster
```bash
aws ecs create-cluster --cluster-name savings-groups-cluster
```

#### Create ECS Service
```bash
aws ecs create-service \
  --cluster savings-groups-cluster \
  --service-name savings-groups-service \
  --task-definition savings-groups-platform:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxxxxxx],securityGroups=[sg-xxxxxxxxx],assignPublicIp=ENABLED}"
```

### 3. Configure Environment Variables

Update the ECS task definition with your specific values:

```json
{
  "environment": [
    {
      "name": "DATABASE_URL",
      "value": "postgresql://postgres:password@your-rds-endpoint:5432/savings_platform"
    },
    {
      "name": "SECRET_KEY",
      "value": "your-production-secret-key"
    },
    {
      "name": "FLASK_ENV",
      "value": "production"
    }
  ]
}
```

## 🔧 Configuration Files

### Dockerfile
- Multi-stage build for optimized production image
- Frontend built with Node.js, served by Flask
- Security-focused with non-root user
- Health checks included

### docker-compose.yml
- Complete local development environment
- PostgreSQL database included
- Nginx reverse proxy with rate limiting
- Volume persistence for database

### nginx.conf
- Production-ready reverse proxy configuration
- Rate limiting for API endpoints
- Security headers
- Gzip compression
- Static file caching

## 🔒 Security Features

### Container Security
- Non-root user execution
- Minimal base images (Alpine Linux)
- No unnecessary packages
- Health checks for monitoring

### Network Security
- Rate limiting on API endpoints
- Security headers (XSS, CSRF protection)
- HTTPS ready (SSL certificates via nginx)

### Data Security
- Environment variables for secrets
- AWS Secrets Manager integration
- Database connection encryption

## 📊 Monitoring & Logging

### Health Checks
- Container health endpoint: `/ping`
- Database connectivity checks
- Automatic container restart on failure

### Logging
- Centralized logging via AWS CloudWatch
- Structured JSON logs
- Error tracking and alerting

### Metrics
- Container resource usage
- Application performance metrics
- Database connection pooling

## 🚀 Deployment Strategies

### Blue-Green Deployment
```bash
# Deploy new version
./scripts/docker-deploy.sh v2.0.0

# Update ECS service with new task definition
aws ecs update-service \
  --cluster savings-groups-cluster \
  --service savings-groups-service \
  --task-definition savings-groups-platform:2
```

### Rolling Updates
- ECS handles rolling updates automatically
- Zero-downtime deployments
- Automatic rollback on health check failures

## 🔧 Troubleshooting

### Common Issues

#### Container Won't Start
```bash
# Check logs
docker-compose logs web

# Check health status
docker-compose ps
```

#### Database Connection Issues
```bash
# Test database connectivity
docker-compose exec web python -c "
from project import create_app, db
app, _ = create_app()
with app.app_context():
    print('Database connection:', db.engine.execute('SELECT 1').scalar())
"
```

#### Performance Issues
```bash
# Monitor resource usage
docker stats

# Check container health
curl http://localhost:5000/ping
```

### Useful Commands

```bash
# View running containers
docker ps

# Execute commands in container
docker-compose exec web bash

# View database
docker-compose exec db psql -U postgres -d savings_platform

# Rebuild specific service
docker-compose up --build web

# Clean up unused images
docker system prune -a
```

## 📈 Scaling

### Horizontal Scaling
- Increase ECS service desired count
- Load balancer distributes traffic
- Database connection pooling handles multiple instances

### Vertical Scaling
- Increase ECS task CPU/memory allocation
- Optimize database instance size
- Configure appropriate resource limits

## 🔄 CI/CD Integration

### GitHub Actions Example
```yaml
name: Deploy to AWS
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to AWS
        run: ./scripts/docker-deploy.sh
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

## 💰 Cost Optimization

### Development
- Use `t3.micro` instances for testing
- Stop services when not in use
- Use spot instances for non-critical workloads

### Production
- Right-size ECS tasks based on usage
- Use reserved instances for predictable workloads
- Implement auto-scaling based on metrics

## 📚 Additional Resources

- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Flask Production Deployment](https://flask.palletsprojects.com/en/2.0.x/deploying/)

---

**Next Steps**: After successful deployment, configure your domain, SSL certificates, and monitoring dashboards for a complete production setup.