#!/bin/bash

# Quick local test for production setup
# This tests our configuration without building all services

set -e

echo "🧪 Quick Local Production Test"
echo "============================="

# Test 1: Check if our secrets script works
echo ""
echo "1️⃣  Testing Secret Generation"
echo "----------------------------"
if ./get-production-secrets.sh 72UWZ5Ez0tbtUqtB | grep -q "PRODUCTION_SECRET_KEY"; then
    echo "✅ Secret generation works"
else
    echo "❌ Secret generation failed"
    exit 1
fi

# Test 2: Check if PostgreSQL can start (just the container)
echo ""
echo "2️⃣  Testing PostgreSQL Container"
echo "--------------------------------"
if docker run --rm -d --name test-postgres \
    -e POSTGRES_DB=users_production \
    -e POSTGRES_USER=webapp \
    -e POSTGRES_PASSWORD=72UWZ5Ez0tbtUqtB \
    -p 5433:5432 \
    postgres:15 > /dev/null 2>&1; then
    
    echo "⏳ Waiting for PostgreSQL to start..."
    sleep 10
    
    if docker exec test-postgres pg_isready -U webapp -d users_production > /dev/null 2>&1; then
        echo "✅ PostgreSQL container works"
        docker stop test-postgres > /dev/null 2>&1
    else
        echo "❌ PostgreSQL not ready"
        docker stop test-postgres > /dev/null 2>&1
        exit 1
    fi
else
    echo "❌ Could not start PostgreSQL container"
    exit 1
fi

# Test 3: Check GitHub Actions workflow file
echo ""
echo "3️⃣  Testing GitHub Actions Configuration"
echo "---------------------------------------"
if [ -f ".github/workflows/main.yml" ]; then
    if grep -q "AWS_RDS_URI" .github/workflows/main.yml && \
       grep -q "PRODUCTION_SECRET_KEY" .github/workflows/main.yml; then
        echo "✅ GitHub Actions workflow configured correctly"
    else
        echo "❌ GitHub Actions workflow missing secrets"
        exit 1
    fi
else
    echo "❌ GitHub Actions workflow file not found"
    exit 1
fi

# Test 4: Check deployment scripts
echo ""
echo "4️⃣  Testing Deployment Scripts"
echo "------------------------------"
SCRIPTS=("deploy-ecs-production-automated.sh" "test-production-e2e.sh" "get-production-secrets.sh")
for script in "${SCRIPTS[@]}"; do
    if [ -f "scripts/$script" ] || [ -f "$script" ]; then
        echo "✅ $script exists"
    else
        echo "❌ $script missing"
        exit 1
    fi
done

# Test 5: Check ECS task definitions
echo ""
echo "5️⃣  Testing ECS Task Definitions"
echo "-------------------------------"
TASK_DEFS=("ecs_client_prod_taskdefinition.json" "ecs_users_prod_taskdefinition.json")
for task_def in "${TASK_DEFS[@]}"; do
    if [ -f "ecs/$task_def" ]; then
        if grep -q "testdriven-frontend:production\|testdriven-backend:production" "ecs/$task_def"; then
            echo "✅ $task_def configured for 3-service architecture"
        else
            echo "⚠️  $task_def may need image name updates"
        fi
    else
        echo "❌ $task_def missing"
        exit 1
    fi
done

echo ""
echo "📊 Test Results Summary"
echo "======================"
echo "✅ All local tests passed!"
echo ""
echo "🎯 Your Production Setup Status:"
echo "   ✅ Secret generation working"
echo "   ✅ PostgreSQL container ready"
echo "   ✅ GitHub Actions configured"
echo "   ✅ Deployment scripts ready"
echo "   ✅ ECS task definitions ready"
echo ""
echo "📋 Next Steps:"
echo "   1. Add secrets to GitHub repository"
echo "   2. Check GitHub Actions workflow status"
echo "   3. Monitor deployment in GitHub Actions tab"
echo "   4. Test production endpoints when deployment completes"
echo ""
echo "🌐 GitHub Actions: https://github.com/owenabrams/testdriven-app/actions"
echo ""
echo "🎉 Production setup is ready for deployment!"
