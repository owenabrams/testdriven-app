#!/bin/bash

# Test script to verify startup integration with SAVINGS_PLATFORM_INTEGRATION_GUIDE.md

echo "🧪 Testing Startup Integration with Integration Guide"
echo "===================================================="

# Check if required files exist
echo "📁 Checking required files..."

required_files=(
    "start-local.sh"
    "services/users/seed_demo_data.py"
    "verify-integration-guide-seeding.py"
    "reseed-integration-guide-data.sh"
    "SAVINGS_PLATFORM_INTEGRATION_GUIDE.md"
)

missing_files=0
for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file"
    else
        echo "   ❌ $file - MISSING"
        missing_files=$((missing_files + 1))
    fi
done

if [ $missing_files -gt 0 ]; then
    echo "❌ Missing $missing_files required files. Cannot proceed."
    exit 1
fi

# Check if start-local.sh references the integration guide
echo ""
echo "🔍 Checking start-local.sh integration..."

if grep -q "SAVINGS_PLATFORM_INTEGRATION_GUIDE.md" start-local.sh; then
    echo "   ✅ start-local.sh references integration guide"
else
    echo "   ❌ start-local.sh does not reference integration guide"
    exit 1
fi

if grep -q "seed_demo_data.py" start-local.sh; then
    echo "   ✅ start-local.sh calls seeding script"
else
    echo "   ❌ start-local.sh does not call seeding script"
    exit 1
fi

# Check if seeding script creates integration guide users
echo ""
echo "👥 Checking seeding script user creation..."

integration_guide_users=(
    "superadmin@testdriven.io"
    "admin@savingsgroups.ug"
    "sarah@kampala.ug"
    "mary@kampala.ug"
    "grace@kampala.ug"
    "alice@kampala.ug"
    "jane@kampala.ug"
    "rose@kampala.ug"
    "john@kampala.ug"
    "peter@kampala.ug"
)

missing_users=0
for email in "${integration_guide_users[@]}"; do
    if grep -q "$email" services/users/seed_demo_data.py; then
        echo "   ✅ $email"
    else
        echo "   ❌ $email - NOT FOUND in seeding script"
        missing_users=$((missing_users + 1))
    fi
done

if [ $missing_users -gt 0 ]; then
    echo "❌ Missing $missing_users users in seeding script"
    exit 1
fi

# Check if verification script exists and is executable
echo ""
echo "🔍 Checking verification script..."

if [ -x "verify-integration-guide-seeding.py" ]; then
    echo "   ✅ verify-integration-guide-seeding.py is executable"
else
    echo "   ❌ verify-integration-guide-seeding.py is not executable"
    chmod +x verify-integration-guide-seeding.py
    echo "   ✅ Fixed: Made verification script executable"
fi

# Check if re-seeding script exists and is executable
echo ""
echo "🔄 Checking re-seeding script..."

if [ -x "reseed-integration-guide-data.sh" ]; then
    echo "   ✅ reseed-integration-guide-data.sh is executable"
else
    echo "   ❌ reseed-integration-guide-data.sh is not executable"
    chmod +x reseed-integration-guide-data.sh
    echo "   ✅ Fixed: Made re-seeding script executable"
fi

# Summary
echo ""
echo "=" * 50
echo "🎯 STARTUP INTEGRATION TEST SUMMARY"
echo "=" * 50
echo "✅ All required files present"
echo "✅ start-local.sh properly integrated with integration guide"
echo "✅ Seeding script includes all integration guide users"
echo "✅ Verification and re-seeding scripts ready"
echo ""
echo "🎉 STARTUP INTEGRATION TEST PASSED!"
echo ""
echo "📋 Next steps:"
echo "   1. Run ./start-local.sh to launch with integration guide data"
echo "   2. Access http://localhost:3000/savings-groups"
echo "   3. Login with demo credentials from integration guide"
echo "   4. Use ./reseed-integration-guide-data.sh if re-seeding needed"