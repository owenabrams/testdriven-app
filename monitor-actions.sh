#!/bin/bash

# Monitor GitHub Actions Status
# Usage: ./monitor-actions.sh

echo "📊 GITHUB ACTIONS MONITORING"
echo "============================="
echo ""

# Get latest commit info
echo "📋 Latest Commit:"
git log --oneline -1
echo ""

# Show current time
echo "⏰ Current Time: $(date)"
echo ""

# Show GitHub Actions URL
echo "🔗 Monitor at: https://github.com/owenabrams/testdriven-app/actions"
echo ""

# Show what we expect to see
echo "🎯 EXPECTED WORKFLOW STEPS:"
echo "✅ 1. Test Job:"
echo "   • Backend linting (relaxed rules)"
echo "   • Backend tests with coverage"
echo "   • Frontend linting (conditional)"
echo "   • Frontend tests (basic test added)"
echo "   • Coverage uploads (non-blocking)"
echo ""
echo "✅ 2. Build and Push Job (if AWS configured):"
echo "   • Docker build for backend and frontend"
echo "   • Push to ECR (if secrets available)"
echo "   • Security scanning"
echo "   • ECS deployment (graceful skip if secrets missing)"
echo ""

echo "🔍 TROUBLESHOOTING:"
echo "• If tests fail: Check test output for specific errors"
echo "• If build fails: Check AWS credentials in GitHub secrets"
echo "• If deployment fails: Check AWS_RDS_URI and PRODUCTION_SECRET_KEY secrets"
echo ""

echo "📱 QUICK STATUS CHECK:"
echo "Run this script again to see updated timestamp"
echo "Or visit the GitHub Actions URL above for real-time status"
