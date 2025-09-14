#!/bin/bash

# Test staging deployment
# Usage: ./scripts/test-staging.sh

set -e

ENVIRONMENT="staging"
REGION=${AWS_DEFAULT_REGION:-us-east-1}

echo "🧪 Testing staging deployment..."

# Get ALB DNS name
echo "📡 Getting ALB DNS name..."
ALB_DNS=$(aws cloudformation describe-stacks \
    --stack-name "testdriven-${ENVIRONMENT}-alb" \
    --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
    --output text \
    --region "$REGION")

if [ -z "$ALB_DNS" ]; then
    echo "❌ Could not get ALB DNS name. Make sure ALB is deployed."
    exit 1
fi

echo "✅ ALB DNS: $ALB_DNS"

# Test health check endpoint
echo ""
echo "🔍 Testing health check endpoint..."
if curl -f -s "http://$ALB_DNS/ping" > /dev/null; then
    echo "✅ Health check passed"
    curl -s "http://$ALB_DNS/ping" | jq .
else
    echo "❌ Health check failed"
    exit 1
fi

# Test users endpoint
echo ""
echo "🔍 Testing users endpoint..."
if curl -f -s "http://$ALB_DNS/users" > /dev/null; then
    echo "✅ Users endpoint accessible"
    echo "📊 Users count: $(curl -s "http://$ALB_DNS/users" | jq '. | length')"
else
    echo "❌ Users endpoint failed"
    exit 1
fi

# Test frontend
echo ""
echo "🔍 Testing frontend..."
if curl -f -s "http://$ALB_DNS/" > /dev/null; then
    echo "✅ Frontend accessible"
else
    echo "❌ Frontend failed"
    exit 1
fi

# Run end-to-end tests if Cypress is available
if [ -f "client/package.json" ] && command -v npm &> /dev/null; then
    echo ""
    echo "🧪 Running end-to-end tests..."
    cd client
    if npm list cypress > /dev/null 2>&1; then
        ./node_modules/.bin/cypress run --config baseUrl=http://$ALB_DNS
        echo "✅ End-to-end tests completed"
    else
        echo "⚠️  Cypress not installed, skipping e2e tests"
    fi
    cd ..
fi

echo ""
echo "🎉 Staging tests completed successfully!"
echo "🌐 Application URL: http://$ALB_DNS"
