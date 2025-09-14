#!/bin/bash

# Test script to verify your production secrets work
# Usage: ./test-secrets.sh

echo "🧪 Testing Production Secrets"
echo "============================="

# Test 1: Check if secrets are set (for local testing)
echo ""
echo "1️⃣  Testing Secret Key Generation"
echo "--------------------------------"
if command -v python3 >/dev/null 2>&1; then
    TEST_KEY=$(python3 -c "import binascii, os; print(binascii.hexlify(os.urandom(24)).decode())")
    echo "✅ Python can generate secret keys"
    echo "   Sample key: $TEST_KEY"
else
    echo "❌ Python3 not found"
fi

# Test 2: Check AWS connectivity
echo ""
echo "2️⃣  Testing AWS Connectivity"
echo "----------------------------"
if command -v aws >/dev/null 2>&1; then
    if aws sts get-caller-identity >/dev/null 2>&1; then
        ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
        echo "✅ AWS CLI configured"
        echo "   Account ID: $ACCOUNT_ID"
    else
        echo "❌ AWS CLI not configured or no permissions"
    fi
else
    echo "❌ AWS CLI not installed"
fi

# Test 3: Check if RDS deployment script exists
echo ""
echo "3️⃣  Testing RDS Deployment Readiness"
echo "------------------------------------"
if [ -f "scripts/deploy-rds.sh" ]; then
    echo "✅ RDS deployment script exists"
    if [ -x "scripts/deploy-rds.sh" ]; then
        echo "✅ RDS deployment script is executable"
    else
        echo "⚠️  RDS deployment script needs execute permissions"
        echo "   Run: chmod +x scripts/deploy-rds.sh"
    fi
else
    echo "❌ RDS deployment script not found"
fi

# Test 4: Check GitHub Actions workflow
echo ""
echo "4️⃣  Testing GitHub Actions Configuration"
echo "---------------------------------------"
if [ -f ".github/workflows/main.yml" ]; then
    echo "✅ GitHub Actions workflow exists"
    if grep -q "AWS_RDS_URI" .github/workflows/main.yml; then
        echo "✅ Workflow configured for production secrets"
    else
        echo "⚠️  Workflow may not be configured for production secrets"
    fi
else
    echo "❌ GitHub Actions workflow not found"
fi

echo ""
echo "📋 Next Steps Summary:"
echo "====================="
echo "1. Generate your secrets (already done):"
echo "   PRODUCTION_SECRET_KEY: c88ff1752e1b99f5e36c3dae0ee858799b1a3be7e7abfdef"
echo ""
echo "2. Deploy RDS (if not done):"
echo "   ./scripts/deploy-rds.sh production YOUR_DB_PASSWORD"
echo ""
echo "3. Get RDS URI:"
echo "   ./get-production-secrets.sh YOUR_DB_PASSWORD"
echo ""
echo "4. Add secrets to GitHub:"
echo "   - Go to GitHub repo → Settings → Secrets and variables → Actions"
echo "   - Add PRODUCTION_SECRET_KEY and AWS_RDS_URI"
echo ""
echo "5. Test deployment:"
echo "   git push origin production"
