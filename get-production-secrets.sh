#!/bin/bash

# Script to help you get production secrets
# Usage: ./get-production-secrets.sh [db-password]

echo "🔐 Getting Production Secrets for GitHub"
echo "========================================"

# Generate Production Secret Key
echo ""
echo "1️⃣  PRODUCTION_SECRET_KEY"
echo "------------------------"
SECRET_KEY=$(python3 -c "import binascii, os; print(binascii.hexlify(os.urandom(24)).decode())")
echo "✅ Generated: $SECRET_KEY"
echo ""
echo "📋 Add this to GitHub Secrets:"
echo "   Name: PRODUCTION_SECRET_KEY"
echo "   Value: $SECRET_KEY"

# Check for RDS
echo ""
echo "2️⃣  AWS_RDS_URI"
echo "---------------"

DB_PASSWORD=${1}

if [ -z "$DB_PASSWORD" ]; then
    echo "⚠️  Database password not provided."
    echo ""
    echo "📋 To get your RDS URI, you have two options:"
    echo ""
    echo "Option A: Deploy RDS first"
    echo "   ./scripts/deploy-rds.sh production YOUR_DB_PASSWORD"
    echo ""
    echo "Option B: If RDS exists, check AWS Console"
    echo "   1. Go to AWS RDS Console"
    echo "   2. Find 'testdriven-production' database"
    echo "   3. Copy the endpoint"
    echo "   4. Format: postgresql://webapp:PASSWORD@ENDPOINT:5432/users_production"
    echo ""
    echo "Then run this script again with password:"
    echo "   $0 YOUR_DB_PASSWORD"
    exit 0
fi

# Try to get RDS endpoint
echo "🔍 Checking for existing RDS instance..."

# Try CloudFormation first
RDS_ENDPOINT=""
if command -v aws >/dev/null 2>&1; then
    RDS_ENDPOINT=$(aws cloudformation describe-stacks \
        --stack-name "testdriven-production-rds" \
        --query 'Stacks[0].Outputs[?OutputKey==`DBEndpoint`].OutputValue' \
        --output text 2>/dev/null)
    
    if [ "$RDS_ENDPOINT" = "None" ] || [ -z "$RDS_ENDPOINT" ]; then
        # Try direct RDS query
        RDS_ENDPOINT=$(aws rds describe-db-instances \
            --db-instance-identifier testdriven-production \
            --query 'DBInstances[0].Endpoint.Address' \
            --output text 2>/dev/null)
    fi
fi

if [ -n "$RDS_ENDPOINT" ] && [ "$RDS_ENDPOINT" != "None" ]; then
    # RDS exists, create the URI
    AWS_RDS_URI="postgresql://webapp:${DB_PASSWORD}@${RDS_ENDPOINT}:5432/users_production"
    echo "✅ Found RDS endpoint: $RDS_ENDPOINT"
    echo "✅ Generated URI: $AWS_RDS_URI"
    echo ""
    echo "📋 Add this to GitHub Secrets:"
    echo "   Name: AWS_RDS_URI"
    echo "   Value: $AWS_RDS_URI"
else
    echo "❌ RDS instance not found or no access permissions"
    echo ""
    echo "📋 Next steps:"
    echo "1. Deploy RDS first:"
    echo "   ./scripts/deploy-rds.sh production $DB_PASSWORD"
    echo ""
    echo "2. Or check AWS Console manually:"
    echo "   - Go to RDS Console"
    echo "   - Find testdriven-production database"
    echo "   - Copy endpoint and create URI:"
    echo "   postgresql://webapp:$DB_PASSWORD@YOUR_ENDPOINT:5432/users_production"
fi

echo ""
echo "🎯 Summary of GitHub Secrets Needed:"
echo "===================================="
echo "PRODUCTION_SECRET_KEY: $SECRET_KEY"
if [ -n "$AWS_RDS_URI" ]; then
    echo "AWS_RDS_URI: $AWS_RDS_URI"
else
    echo "AWS_RDS_URI: [Deploy RDS first or use local PostgreSQL]"
    echo ""
    echo "🐘 LOCAL POSTGRESQL OPTION (FREE):"
    echo "AWS_RDS_URI: postgresql://webapp:${DB_PASSWORD:-72UWZ5Ez0tbtUqtB}@localhost:5432/users_production"
fi

echo ""
echo "📝 How to add to GitHub:"
echo "1. Go to your GitHub repository"
echo "2. Settings → Secrets and variables → Actions"
echo "3. Click 'New repository secret'"
echo "4. Add both secrets above"
