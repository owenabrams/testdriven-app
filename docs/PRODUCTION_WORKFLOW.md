# 🚀 Production Workflow Guide

## 🌐 Your Production App URLs

- **🖥️ Frontend (React App)**: http://35.172.194.242
- **🔧 Backend API (Users Service)**: http://18.234.250.255:5000
- **📊 Health Check**: http://18.234.250.255:5000/monitoring/health
- **📈 Monitoring**: http://18.234.250.255:5000/monitoring/metrics

## 🔄 Development to Production Workflow

### Quick Start
```bash
# Use the automated workflow script
./scripts/dev-to-prod-workflow.sh
```

### Manual Workflow Steps

#### 1. 🏠 Local Development
```bash
# Set up development environment
cd services/users
export APP_SETTINGS=project.config.DevelopmentConfig

# Start local development server
python manage.py runserver
# Your local app runs at: http://localhost:5000
```

#### 2. 🗃️ Database Changes (Models & Migrations)
```bash
# After changing models in project/api/models.py
python manage.py db migrate -m "Describe your changes"
python manage.py db upgrade

# Test locally
python -m pytest
```

#### 3. 🧪 Testing Before Deployment
```bash
# Run all tests
python -m pytest project/tests/ -v

# Run Aurora integration tests
python -m pytest project/tests/test_aurora_integration.py -v

# Test specific functionality
python -m pytest project/tests/test_users.py -v
```

#### 4. 🚀 Deploy to Production
```bash
# Commit your changes
git add .
git commit -m "✨ Add new feature with database changes"

# Deploy to production (triggers GitHub Actions)
git push origin production
```

#### 5. 📊 Monitor Deployment
- **GitHub Actions**: https://github.com/owenabrams/testdriven-app/actions
- **Production Health**: http://18.234.250.255:5000/monitoring/health

## 🔧 What Happens During Deployment

### Automatic CI/CD Pipeline:
1. **🧪 Testing Phase**:
   - Run all unit tests with SQLite
   - Run Aurora integration tests
   - Validate code quality

2. **🏗️ Build Phase**:
   - Build Docker images for users service and client
   - Push to Amazon ECR with latest commit hash
   - Cache layers for faster builds

3. **🗃️ Database Migration Phase**:
   - Connect to Aurora PostgreSQL
   - Run Flask-Migrate database migrations
   - Validate schema changes

4. **🚀 Deployment Phase**:
   - Deploy new containers to ECS
   - Zero-downtime rolling deployment
   - Health check validation

5. **✅ Verification Phase**:
   - Verify service health
   - Check database connectivity
   - Validate API endpoints

## 🗃️ Database Architecture

### Development Environment:
- **Database**: SQLite (`instance/dev.db`)
- **Fast**: No setup required
- **Isolated**: Each developer has own database

### Production Environment:
- **Database**: Aurora PostgreSQL
- **Endpoint**: `testdriven-production-aurora.cluster-xxx.rds.amazonaws.com`
- **Scalable**: Auto-scaling, high availability
- **Secure**: Encrypted, VPC isolated

### Migration Strategy:
- **Same migrations** work for both SQLite and PostgreSQL
- **Automatic detection** of database type
- **Safe rollbacks** with backup retention

## 🔍 Monitoring & Debugging

### Health Checks:
```bash
# Check service health
curl http://18.234.250.255:5000/monitoring/health

# Check database connection
curl http://18.234.250.255:5000/monitoring/connection-test

# View metrics
curl http://18.234.250.255:5000/monitoring/metrics
```

### Logs:
```bash
# View ECS service logs
aws logs tail testdriven-users-prod --follow

# View specific container logs
aws ecs describe-tasks --cluster testdriven-production-cluster \
  --tasks $(aws ecs list-tasks --cluster testdriven-production-cluster \
  --service-name testdriven-users-production-service --query 'taskArns[0]' --output text)
```

### Database Access:
```bash
# Connect to Aurora PostgreSQL
./scripts/connect-aurora.sh

# Run database commands
python manage.py db current  # Check migration status
python manage.py db history  # View migration history
```

## 🛠️ Common Development Scenarios

### Adding New API Endpoints:
1. Add route in `project/api/users.py` or create new blueprint
2. Test locally: `python -m pytest project/tests/test_users.py`
3. Deploy: `git push origin production`

### Adding New Database Models:
1. Create model in `project/api/models.py`
2. Generate migration: `python manage.py db migrate -m "Add new model"`
3. Test migration: `python manage.py db upgrade`
4. Test locally: `python -m pytest`
5. Deploy: `git push origin production`

### Frontend Changes:
1. Modify React components in `services/client/src/`
2. Test locally: `npm test`
3. Deploy: `git push origin production`

### Environment Variables:
- **Local**: Set in your shell or `.env` file
- **Production**: Update GitHub Secrets at:
  https://github.com/owenabrams/testdriven-app/settings/secrets/actions

## 🚨 Troubleshooting

### Deployment Fails:
1. Check GitHub Actions logs
2. Verify GitHub Secrets are correct
3. Check Aurora cluster status: `aws rds describe-db-clusters --db-cluster-identifier testdriven-production-aurora`

### Database Issues:
1. Check connection: `curl http://18.234.250.255:5000/monitoring/connection-test`
2. Verify migrations: `python manage.py db current`
3. Check Aurora status in AWS Console

### Service Not Responding:
1. Check ECS service status: `aws ecs describe-services --cluster testdriven-production-cluster --services testdriven-users-production-service`
2. View logs: `aws logs tail testdriven-users-prod --follow`
3. Restart service: `aws ecs update-service --cluster testdriven-production-cluster --service testdriven-users-production-service --force-new-deployment`

## 📚 Additional Resources

- **Aurora Setup**: `./scripts/setup-aurora-serverless.sh`
- **Password Reset**: `./scripts/setup-aurora-password.sh`
- **Health Validation**: `./scripts/verify-deployment-health.sh`
- **GitHub Actions**: `.github/workflows/main.yml`

## 🎯 Best Practices

1. **Always test locally** before deploying
2. **Use descriptive commit messages** for easier tracking
3. **Monitor deployments** in GitHub Actions
4. **Check health endpoints** after deployment
5. **Keep migrations small** and reversible
6. **Use feature branches** for large changes
7. **Review logs** if issues occur

Your Aurora PostgreSQL integration is now production-ready with automated CI/CD! 🎉
