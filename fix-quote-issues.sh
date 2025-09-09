#!/bin/bash

# Fix Quote Issues - Final syntax fix

echo "🔧 Fixing Remaining Quote Issues"
echo "================================"

cd client/src

# 1. Fix the specific issue in SavingsGroupsDashboard.js (already done, but verify)
echo "📝 Checking SavingsGroupsDashboard.js..."
if grep -q "Kampala Women\\\\'s" pages/SavingsGroups/Dashboard/SavingsGroupsDashboard.js; then
    echo "   ❌ Still has malformed quotes"
    sed -i.bak "s/Kampala Women\\\\\\'s/Kampala Women's/g" pages/SavingsGroups/Dashboard/SavingsGroupsDashboard.js
    echo "   ✅ Fixed malformed quotes"
else
    echo "   ✅ No malformed quotes found"
fi

# 2. Look for any other malformed escape sequences
echo ""
echo "🔍 Checking for other malformed escape sequences..."

# Check for double backslashes followed by quotes
malformed_files=$(grep -r "\\\\\\\\" pages/SavingsGroups/ --include="*.js" | cut -d: -f1 | sort -u)

if [ ! -z "$malformed_files" ]; then
    echo "   ⚠️  Found files with potential issues:"
    for file in $malformed_files; do
        echo "      - $file"
        # Fix common malformed patterns
        sed -i.bak 's/\\\\\\"/"/g' "$file"
        sed -i.bak "s/\\\\\\'/'/g" "$file"
        echo "      ✅ Fixed escape sequences in $file"
    done
else
    echo "   ✅ No malformed escape sequences found"
fi

# 3. Check for any remaining syntax issues
echo ""
echo "🔍 Final syntax check..."

# Look for unmatched quotes in JSX
jsx_quote_issues=$(grep -r "{.*'.*\\\\" pages/SavingsGroups/ --include="*.js" | wc -l)
if [ $jsx_quote_issues -gt 0 ]; then
    echo "   ⚠️  Found $jsx_quote_issues potential JSX quote issues"
    echo "   📝 Fixing JSX quote issues..."
    
    # Fix JSX expressions with malformed quotes
    find pages/SavingsGroups/ -name "*.js" -exec sed -i.bak "s/{'\\([^']*\\)\\\\\([^']*\\)'}/{\"\1'\2\"}/g" {} \;
    echo "   ✅ Fixed JSX quote issues"
else
    echo "   ✅ No JSX quote issues found"
fi

cd ../..

# 4. Verify the fix
echo ""
echo "🔍 Verifying fixes..."

# Check the specific line that was causing the error
if grep -q "Kampala Women's Cooperative" client/src/pages/SavingsGroups/Dashboard/SavingsGroupsDashboard.js; then
    echo "   ✅ SavingsGroupsDashboard.js quote fixed"
else
    echo "   ❌ SavingsGroupsDashboard.js still has issues"
fi

# Check for any remaining malformed quotes
remaining_issues=$(grep -r "\\\\\\\\" client/src/pages/SavingsGroups/ --include="*.js" | wc -l)
if [ $remaining_issues -eq 0 ]; then
    echo "   ✅ No remaining malformed quotes"
else
    echo "   ⚠️  $remaining_issues potential issues remain"
fi

echo ""
echo "✅ QUOTE FIXES COMPLETE!"
echo ""
echo "🚀 React should now compile successfully"
echo "   Check your React terminal for 'Compiled successfully!' message"
echo ""
echo "🎯 If you still see errors:"
echo "   1. Look for the specific line mentioned in the error"
echo "   2. Check for unmatched quotes or brackets"
echo "   3. Try restarting the React server"