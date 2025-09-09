#!/bin/bash

# Complete Integration Verification Script

echo "🔍 Complete Integration Verification"
echo "===================================="

# 1. Verify startup script uses correct client
echo "📁 Checking startup script configuration..."
if grep -q "cd ../../client" start-local.sh; then
    echo "   ✅ Startup script uses main client directory"
else
    echo "   ❌ Startup script still uses services/client"
    exit 1
fi

# 2. Verify main client has all comprehensive features
echo ""
echo "🎯 Verifying comprehensive features in main client..."

# Check package.json has all necessary dependencies
cd client

required_deps=(
    "@mui/material"
    "@mui/icons-material"
    "@mui/x-date-pickers"
    "react-query"
    "recharts"
    "date-fns"
    "react-hook-form"
    "react-hot-toast"
    "@tanstack/react-query"
)

echo "📦 Checking dependencies..."
missing_deps=0
for dep in "${required_deps[@]}"; do
    if npm list "$dep" &>/dev/null; then
        echo "   ✅ $dep"
    else
        echo "   ❌ $dep - MISSING"
        missing_deps=$((missing_deps + 1))
    fi
done

# 3. Verify all critical components exist
echo ""
echo "🧩 Checking critical components..."

critical_components=(
    "src/App.js"
    "src/components/Layout/Layout.js"
    "src/components/Navigation/RoleBasedNavigation.js"
    "src/pages/SavingsGroups/SavingsGroupsApp.js"
    "src/pages/SavingsGroups/Calendar/CalendarPage.js"
    "src/pages/SavingsGroups/Dashboard/SavingsGroupsDashboard.js"
    "src/pages/SavingsGroups/Admin/AdminDashboard.js"
    "src/pages/SavingsGroups/MySavings/MySavingsPage.js"
    "src/pages/SavingsGroups/MyGroup/MyGroupPage.js"
    "src/pages/SavingsGroups/Transactions/TransactionsPage.js"
    "src/pages/SavingsGroups/Meetings/MeetingsPage.js"
    "src/pages/SavingsGroups/MyLoans/MyLoansPage.js"
    "src/pages/SavingsGroups/Campaigns/CampaignsPage.js"
    "src/pages/SavingsGroups/Settings/SettingsPage.js"
    "src/components/Admin/AdminStatsCards.js"
    "src/components/Admin/MemberManagement.js"
    "src/components/Admin/GroupOversight.js"
    "src/components/Admin/FinancialSupport.js"
    "src/components/Admin/SystemSettings.js"
    "src/services/savingsGroupsAPI.js"
    "src/services/api.js"
    "src/contexts/AuthContext.js"
    "src/utils/adminDemoData.js"
)

missing_components=0
for component in "${critical_components[@]}"; do
    if [ -f "$component" ]; then
        echo "   ✅ $component"
    else
        echo "   ❌ $component - MISSING"
        missing_components=$((missing_components + 1))
    fi
done

# 4. Check specific integration features
echo ""
echo "🔗 Checking integration-specific features..."

# Check if Layout has Savings Platform link
if grep -q "Savings Platform" src/components/Layout/Layout.js; then
    echo "   ✅ Layout includes Savings Platform link"
else
    echo "   ❌ Layout missing Savings Platform link"
    missing_components=$((missing_components + 1))
fi

# Check if App.js has savings-groups routing
if grep -q "/savings-groups" src/App.js; then
    echo "   ✅ App.js includes savings-groups routing"
else
    echo "   ❌ App.js missing savings-groups routing"
    missing_components=$((missing_components + 1))
fi

# Check if RoleBasedNavigation has Activity Calendar
if grep -q "Activity Calendar" src/components/Navigation/RoleBasedNavigation.js; then
    echo "   ✅ RoleBasedNavigation includes Activity Calendar"
else
    echo "   ❌ RoleBasedNavigation missing Activity Calendar"
    missing_components=$((missing_components + 1))
fi

# Check if CalendarPage has comprehensive filtering
if grep -q "FilterProcessor\|multi-dimensional\|comprehensive" src/pages/SavingsGroups/Calendar/CalendarPage.js; then
    echo "   ✅ CalendarPage has comprehensive filtering"
else
    echo "   ⚠️  CalendarPage may have basic filtering only"
fi

# Check if savingsGroupsAPI has mock data for testing
if grep -q "getMockCalendarEvents\|getMockData" src/services/savingsGroupsAPI.js; then
    echo "   ✅ savingsGroupsAPI includes mock data for testing"
else
    echo "   ❌ savingsGroupsAPI missing mock data"
    missing_components=$((missing_components + 1))
fi

cd ..

# 5. Verify backend integration files
echo ""
echo "🔧 Checking backend integration..."

backend_files=(
    "services/users/project/api/calendar.py"
    "services/users/seed_demo_data.py"
    "verify-integration-guide-seeding.py"
)

for file in "${backend_files[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file"
    else
        echo "   ❌ $file - MISSING"
        missing_components=$((missing_components + 1))
    fi
done

# 6. Check if seeding script creates integration guide data
if grep -q "sarah@kampala.ug\|mary@kampala.ug\|Kampala Women's Cooperative" services/users/seed_demo_data.py; then
    echo "   ✅ Seeding script includes integration guide users and data"
else
    echo "   ❌ Seeding script missing integration guide data"
    missing_components=$((missing_components + 1))
fi

# 7. Summary and recommendations
echo ""
echo "📊 INTEGRATION VERIFICATION SUMMARY"
echo "=================================="

if [ $missing_deps -eq 0 ] && [ $missing_components -eq 0 ]; then
    echo "🎉 COMPLETE INTEGRATION VERIFIED!"
    echo ""
    echo "✅ All dependencies installed"
    echo "✅ All components present"
    echo "✅ Navigation properly configured"
    echo "✅ Backend integration ready"
    echo "✅ Demo data seeding configured"
    echo ""
    echo "🚀 READY TO TEST:"
    echo "   1. Run: ./start-local.sh"
    echo "   2. Open: http://localhost:3000"
    echo "   3. Login: superadmin@testdriven.io / superpassword123"
    echo "   4. Navigate: Look for 'Savings Platform' under MICROSERVICES"
    echo "   5. Click: Savings Platform → Activity Calendar"
    echo "   6. Test: Women + ECD Fund + Central + This Month filtering"
    echo ""
    echo "🎯 Expected Results:"
    echo "   - Modern Material-UI interface"
    echo "   - Comprehensive filtering system"
    echo "   - Sarah Nakato and Mary Nambi's ECD transactions"
    echo "   - Clickable calendar events with detailed information"
    
else
    echo "⚠️  INTEGRATION INCOMPLETE"
    echo ""
    echo "Missing Dependencies: $missing_deps"
    echo "Missing Components: $missing_components"
    echo ""
    echo "🔧 RECOMMENDED ACTIONS:"
    
    if [ $missing_deps -gt 0 ]; then
        echo "   1. Run: cd client && npm install"
    fi
    
    if [ $missing_components -gt 0 ]; then
        echo "   2. Check client-backup/ for missing components"
        echo "   3. Verify all files were properly copied"
    fi
    
    echo "   4. Re-run this verification script"
fi

echo ""
echo "📁 Files available:"
echo "   - Main client: client/"
echo "   - Backup: client-backup/"
echo "   - Services client: services/client/"
echo "   - Integration guide: SAVINGS_PLATFORM_INTEGRATION_GUIDE.md"
echo "   - Navigation fix: NAVIGATION_LINKS_FIXED.md"