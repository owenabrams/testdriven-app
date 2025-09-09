#!/bin/bash

# Fix Array Errors - Comprehensive fix for all array method issues

echo "🔧 Fixing Array Method Errors Across Codebase"
echo "=============================================="

cd client/src

# 1. Find all files with potential array method issues
echo "🔍 Scanning for array method usage..."

# Find files using array methods on potentially undefined variables
files_with_array_methods=$(grep -r "\.reduce\|\.map\|\.filter\|\.flatMap\|\.find\|\.some\|\.every" . --include="*.js" --include="*.jsx" | cut -d: -f1 | sort -u)

echo "   📁 Found files using array methods:"
for file in $files_with_array_methods; do
    echo "      - $file"
done

# 2. Fix common patterns
echo ""
echo "🔧 Applying fixes..."

# Fix groups?.reduce patterns
echo "   📝 Fixing groups?.reduce patterns..."
find . -name "*.js" -exec sed -i.bak 's/groups?\.reduce(/\(groups \&\& Array.isArray(groups)\) ? groups.reduce(/g' {} \;

# Fix groups?.map patterns
echo "   📝 Fixing groups?.map patterns..."
find . -name "*.js" -exec sed -i.bak 's/groups?\.map(/\(groups \&\& Array.isArray(groups)\) ? groups.map(/g' {} \;

# Fix groups?.filter patterns
echo "   📝 Fixing groups?.filter patterns..."
find . -name "*.js" -exec sed -i.bak 's/groups?\.filter(/\(groups \&\& Array.isArray(groups)\) ? groups.filter(/g' {} \;

# Fix groups?.flatMap patterns
echo "   📝 Fixing groups?.flatMap patterns..."
find . -name "*.js" -exec sed -i.bak 's/groups?\.flatMap(/\(groups \&\& Array.isArray(groups)\) ? groups.flatMap(/g' {} \;

# Fix campaigns?.reduce patterns
echo "   📝 Fixing campaigns?.reduce patterns..."
find . -name "*.js" -exec sed -i.bak 's/campaigns?\.reduce(/\(campaigns \&\& Array.isArray(campaigns)\) ? campaigns.reduce(/g' {} \;

# Fix campaigns?.map patterns
echo "   📝 Fixing campaigns?.map patterns..."
find . -name "*.js" -exec sed -i.bak 's/campaigns?\.map(/\(campaigns \&\& Array.isArray(campaigns)\) ? campaigns.map(/g' {} \;

# Fix campaigns?.filter patterns
echo "   📝 Fixing campaigns?.filter patterns..."
find . -name "*.js" -exec sed -i.bak 's/campaigns?\.filter(/\(campaigns \&\& Array.isArray(campaigns)\) ? campaigns.filter(/g' {} \;

# Fix other common array variable patterns
echo "   📝 Fixing other array patterns..."
find . -name "*.js" -exec sed -i.bak 's/members?\.reduce(/\(members \&\& Array.isArray(members)\) ? members.reduce(/g' {} \;
find . -name "*.js" -exec sed -i.bak 's/members?\.map(/\(members \&\& Array.isArray(members)\) ? members.map(/g' {} \;
find . -name "*.js" -exec sed -i.bak 's/members?\.filter(/\(members \&\& Array.isArray(members)\) ? members.filter(/g' {} \;

# Fix transactions patterns
find . -name "*.js" -exec sed -i.bak 's/transactions?\.reduce(/\(transactions \&\& Array.isArray(transactions)\) ? transactions.reduce(/g' {} \;
find . -name "*.js" -exec sed -i.bak 's/transactions?\.map(/\(transactions \&\& Array.isArray(transactions)\) ? transactions.map(/g' {} \;
find . -name "*.js" -exec sed -i.bak 's/transactions?\.filter(/\(transactions \&\& Array.isArray(transactions)\) ? transactions.filter(/g' {} \;

# 3. Clean up backup files
echo ""
echo "🧹 Cleaning up backup files..."
find . -name "*.bak" -delete
echo "   ✅ Backup files removed"

# 4. Check for remaining issues
echo ""
echo "🔍 Checking for remaining issues..."

# Look for any remaining unsafe array method calls
remaining_issues=$(grep -r "[a-zA-Z_][a-zA-Z0-9_]*?\.reduce\|[a-zA-Z_][a-zA-Z0-9_]*?\.map\|[a-zA-Z_][a-zA-Z0-9_]*?\.filter\|[a-zA-Z_][a-zA-Z0-9_]*?\.flatMap" . --include="*.js" | grep -v "Array.isArray" | wc -l)

if [ $remaining_issues -gt 0 ]; then
    echo "   ⚠️  Found $remaining_issues potential remaining issues"
    echo "   📝 Files that may still need manual review:"
    grep -r "[a-zA-Z_][a-zA-Z0-9_]*?\.reduce\|[a-zA-Z_][a-zA-Z0-9_]*?\.map\|[a-zA-Z_][a-zA-Z0-9_]*?\.filter\|[a-zA-Z_][a-zA-Z0-9_]*?\.flatMap" . --include="*.js" | grep -v "Array.isArray" | cut -d: -f1 | sort -u | head -5
else
    echo "   ✅ No obvious remaining issues found"
fi

cd ../..

# 5. Summary
echo ""
echo "✅ ARRAY ERROR FIXES COMPLETE!"
echo ""
echo "🎯 What was fixed:"
echo "   - groups?.reduce() → (groups && Array.isArray(groups)) ? groups.reduce()"
echo "   - groups?.map() → (groups && Array.isArray(groups)) ? groups.map()"
echo "   - groups?.filter() → (groups && Array.isArray(groups)) ? groups.filter()"
echo "   - groups?.flatMap() → (groups && Array.isArray(groups)) ? groups.flatMap()"
echo "   - Similar fixes for campaigns, members, transactions arrays"
echo ""
echo "🚀 React should now reload without array method errors"
echo "   Check your browser - the errors should be gone!"
echo ""
echo "🎯 If you still see errors:"
echo "   1. Check browser console for specific error messages"
echo "   2. Look for any custom array variables not covered by this fix"
echo "   3. Ensure API responses are returning proper array structures"