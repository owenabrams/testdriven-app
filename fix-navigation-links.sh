#!/bin/bash

# Fix Navigation Links - Ensure Savings Platform link appears

echo "🔧 Fixing Navigation Links for Savings Platform"
echo "=============================================="

# 1. Verify we're using the correct client directory
echo "📁 Checking client directory setup..."

if [ -d "client/src" ]; then
    echo "   ✅ Main client directory exists"
else
    echo "   ❌ Main client directory missing"
    exit 1
fi

if [ -f "client/src/components/Layout/Layout.js" ]; then
    echo "   ✅ Modern Layout component exists"
else
    echo "   ❌ Modern Layout component missing"
    exit 1
fi

# 2. Check if startup script uses correct client
echo ""
echo "🔍 Checking startup script..."

if grep -q "cd ../../client" start-local.sh; then
    echo "   ✅ Startup script uses correct client directory"
else
    echo "   ❌ Startup script uses wrong client directory"
    echo "   🔧 Fixing startup script..."
    sed -i.bak 's|cd ../../services/client|cd ../../client|g' start-local.sh
    echo "   ✅ Fixed startup script"
fi

# 3. Install missing dependencies
echo ""
echo "📦 Installing missing dependencies..."

cd client

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "   📦 Installing all dependencies..."
    npm install
else
    echo "   📦 Updating dependencies..."
    npm install @mui/x-date-pickers@^5.0.0
fi

# 4. Verify key files exist
echo ""
echo "🔍 Verifying key navigation files..."

key_files=(
    "src/components/Layout/Layout.js"
    "src/components/Navigation/RoleBasedNavigation.js"
    "src/pages/SavingsGroups/SavingsGroupsApp.js"
    "src/pages/SavingsGroups/Calendar/CalendarPage.js"
    "src/App.js"
)

missing_files=0
for file in "${key_files[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file"
    else
        echo "   ❌ $file - MISSING"
        missing_files=$((missing_files + 1))
    fi
done

if [ $missing_files -gt 0 ]; then
    echo "   ❌ $missing_files files missing. Navigation may not work properly."
    exit 1
fi

# 5. Check if Layout includes Savings Platform link
echo ""
echo "🔍 Checking Layout component for Savings Platform link..."

if grep -q "Savings Platform" src/components/Layout/Layout.js; then
    echo "   ✅ Savings Platform link found in Layout"
else
    echo "   ❌ Savings Platform link missing from Layout"
    exit 1
fi

# 6. Check routing setup
echo ""
echo "🔍 Checking App.js routing..."

if grep -q "/savings-groups" src/App.js; then
    echo "   ✅ Savings Groups routing configured"
else
    echo "   ❌ Savings Groups routing missing"
    exit 1
fi

cd ..

# 7. Create test instructions
echo ""
echo "📋 Creating test instructions..."

cat > navigation-test-instructions.txt << EOF
🧪 NAVIGATION TEST INSTRUCTIONS
==============================

1. STOP any currently running servers (Ctrl+C)

2. START the corrected application:
   ./start-local.sh

3. OPEN browser and go to:
   http://localhost:3000

4. LOGIN with:
   Email: superadmin@testdriven.io
   Password: superpassword123

5. LOOK FOR in the left sidebar:
   - Main menu items (Dashboard, System Admin, etc.)
   - "MICROSERVICES" section header
   - "Savings Platform" link under MICROSERVICES

6. CLICK "Savings Platform" to navigate to:
   http://localhost:3000/savings-groups

7. VERIFY you see:
   - Savings Groups interface with its own navigation
   - "Activity Calendar" link in the Savings Groups navigation

8. CLICK "Activity Calendar" to access the filtering system

DIRECT LINKS (if navigation fails):
- Main App: http://localhost:3000
- Savings Platform: http://localhost:3000/savings-groups
- Test Page: file://$(pwd)/test-navigation-links.html

TROUBLESHOOTING:
- Clear browser cache if you see old interface
- Check browser console for errors
- Ensure you're logged in as super admin
- Verify correct client is running (should show Material-UI interface)
EOF

echo "   ✅ Test instructions created: navigation-test-instructions.txt"

# 8. Summary
echo ""
echo "✅ NAVIGATION FIX COMPLETE!"
echo "=========================="
echo "🎯 Next steps:"
echo "   1. Run: ./start-local.sh"
echo "   2. Open: http://localhost:3000"
echo "   3. Login as super admin"
echo "   4. Look for 'Savings Platform' under MICROSERVICES"
echo "   5. Read: navigation-test-instructions.txt for detailed steps"
echo ""
echo "🔗 Direct link to Savings Platform: http://localhost:3000/savings-groups"
echo "📋 Test page: file://$(pwd)/test-navigation-links.html"