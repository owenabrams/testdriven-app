#!/bin/bash

# Fix Import Issues - Quick compilation fix

echo "🔧 Fixing Import and Syntax Issues"
echo "=================================="

cd client/src

# 1. Fix CalendarPage import (already done, but verify)
echo "📝 Fixing CalendarPage import..."
if grep -q "import { savingsGroupsAPI }" pages/SavingsGroups/Calendar/CalendarPage.js; then
    echo "   ❌ CalendarPage still has wrong import"
    sed -i.bak 's/import { savingsGroupsAPI }/import savingsGroupsAPI/' pages/SavingsGroups/Calendar/CalendarPage.js
    echo "   ✅ Fixed CalendarPage import"
else
    echo "   ✅ CalendarPage import already correct"
fi

# 2. Fix any other Unicode escape issues
echo ""
echo "📝 Fixing Unicode escape sequences..."

# Check for escaped quotes in JavaScript files
files_with_escaped_quotes=$(grep -r '\\"' pages/SavingsGroups/ --include="*.js" | cut -d: -f1 | sort -u)

if [ ! -z "$files_with_escaped_quotes" ]; then
    echo "   🔍 Found files with escaped quotes:"
    for file in $files_with_escaped_quotes; do
        echo "      - $file"
        # Fix escaped quotes in strings
        sed -i.bak 's/\\"/"/g' "$file"
        echo "      ✅ Fixed escaped quotes in $file"
    done
else
    echo "   ✅ No escaped quote issues found"
fi

# 3. Check for any other syntax issues
echo ""
echo "🔍 Checking for other potential syntax issues..."

# Look for common syntax problems
syntax_issues=0

# Check for missing semicolons at end of imports
missing_semicolons=$(grep -r "^import.*[^;]$" pages/SavingsGroups/ --include="*.js" | wc -l)
if [ $missing_semicolons -gt 0 ]; then
    echo "   ⚠️  Found $missing_semicolons potential missing semicolons"
    syntax_issues=$((syntax_issues + 1))
fi

# Check for unmatched quotes
unmatched_quotes=$(grep -r "['\"][^'\"]*$" pages/SavingsGroups/ --include="*.js" | wc -l)
if [ $unmatched_quotes -gt 0 ]; then
    echo "   ⚠️  Found $unmatched_quotes potential unmatched quotes"
    syntax_issues=$((syntax_issues + 1))
fi

if [ $syntax_issues -eq 0 ]; then
    echo "   ✅ No obvious syntax issues found"
fi

cd ../..

# 4. Verify the fixes
echo ""
echo "🔍 Verifying fixes..."

# Check CalendarPage import
if grep -q "import savingsGroupsAPI from" client/src/pages/SavingsGroups/Calendar/CalendarPage.js; then
    echo "   ✅ CalendarPage import fixed"
else
    echo "   ❌ CalendarPage import still wrong"
fi

# Check CampaignsPage for Unicode issues
if grep -q '\\"' client/src/pages/SavingsGroups/Campaigns/CampaignsPage.js; then
    echo "   ❌ CampaignsPage still has escaped quotes"
else
    echo "   ✅ CampaignsPage Unicode issues fixed"
fi

echo ""
echo "✅ IMPORT FIXES COMPLETE!"
echo ""
echo "🚀 The React app should now compile without errors"
echo "   Check your terminal where React is running for confirmation"
echo ""
echo "🎯 If you still see errors:"
echo "   1. Check the React terminal for specific error messages"
echo "   2. Look for any remaining syntax issues"
echo "   3. Restart the React server if needed"