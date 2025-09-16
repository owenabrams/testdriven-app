# Microservices with Docker, Flask, and React

<!-- VERIFICATION TRIGGER: Testing GitHub Actions fixes - New Run -->

[![Build Status](https://github.com/owenabrams/testdriven-app/workflows/Continuous%20Integration%20and%20Delivery/badge.svg?branch=main)](https://github.com/owenabrams/testdriven-app/actions)

## 🎉 Production Setup Complete!

This application features a modern 3-service microservices architecture with automated deployment:

### ✅ **Architecture**
- **Frontend Service**: React application with nginx
- **Backend Service**: Flask API with PostgreSQL
- **Database Service**: PostgreSQL (Local for testing, RDS for production)

### ✅ **Deployment & CI/CD**
- **GitHub Actions**: Automated testing and deployment
- **ECS Production Automation**: Zero-downtime deployments
- **Branch-based Deployment**: Push to `production` branch triggers deployment
- **Modern Secrets Management**: GitHub repository secrets

### ✅ **Cost Optimization**
- **Local PostgreSQL**: $0/month for testing and development
- **Easy RDS Migration**: Switch to managed database when needed
- **Efficient Resource Usage**: Optimized container configurations

### 🚀 **Quick Start**

#### **Local Development**
```bash
# Start all services locally
docker-compose up -d --build

# Create and seed database
docker-compose exec backend python manage.py recreate_db
docker-compose exec backend python manage.py seed_db

# Run tests
./test-tutorial.sh server    # Backend tests
./test-tutorial.sh client    # Frontend tests
./test-tutorial.sh e2e       # End-to-end tests

# Access database
docker-compose exec db psql -U postgres

# Stop services
docker-compose down
```

#### **Production Deployment**
```bash
# Automated deployment (triggers on push to production branch)
git push origin production

# Manual deployment
./scripts/deploy-production-complete.sh DB_PASSWORD SECRET_KEY

# Local production testing
./scripts/test-local-production.sh
```

### 📋 **Key Adaptations from TestDriven Tutorial**
- ✅ **GitHub Actions** instead of Travis CI
- ✅ **3-service architecture** instead of 4-service
- ✅ **us-east-1** region instead of us-west-1
- ✅ **Local PostgreSQL** option for cost-effective testing
- ✅ **Modern container orchestration** with ECS

### 🔧 **Production Services**
- **Frontend**: `testdriven-client-prod-service` (React + nginx)
- **Backend**: `testdriven-users-prod-service` (Flask API)
- **Database**: Local PostgreSQL or AWS RDS
- **Load Balancer**: Application Load Balancer with path-based routing

### 📊 **Monitoring & Testing**
- **CloudWatch Logs**: Centralized logging for all services
- **Health Checks**: Automated service health monitoring
- **End-to-End Testing**: Comprehensive test suite with Cypress
- **Database Connectivity**: Automated connection testing

---

**Built following the TestDriven.io tutorial with modern adaptations for GitHub Actions and cost optimization.**
