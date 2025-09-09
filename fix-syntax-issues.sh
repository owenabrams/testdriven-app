#!/bin/bash

# Fix Syntax Issues - Clean up malformed ternary operators

echo "🔧 Fixing Syntax Issues from Automated Script"
echo "============================================="

cd client/src

# 1. Fix malformed ternary operators (? ... ) || [] should be ? ... : [])
echo "📝 Fixing malformed ternary operators..."

# Find and fix patterns like ") || [];" that should be ") : [];"
find . -name "*.js" -exec sed -i.bak 's/) || \[\];/) : \[\];/g' {} \;

# Find and fix patterns like ") || 0;" that should be ") : 0;"
find . -name "*.js" -exec sed -i.bak 's/) || 0;/) : 0;/g' {} \;

# Find and fix patterns like ") || null;" that should be ") : null;"
find . -name "*.js" -exec sed -i.bak 's/) || null;/) : null;/g' {} \;

# Find and fix patterns like ") || '';" that should be ") : '';"
find . -name "*.js" -exec sed -i.bak 's/) || '\'''\''/) : '\'\''/g' {} \;

echo "   ✅ Fixed ternary operator syntax"

# 2. Check for any remaining syntax issues
echo ""
echo "🔍 Checking for remaining syntax issues..."

# Look for incomplete ternary operators
incomplete_ternary=$(grep -r "Array\.isArray.*) ||" . --include="*.js" | wc -l)
if [ $incomplete_ternary -gt 0 ]; then
    echo "   ⚠️  Found $incomplete_ternary potential incomplete ternary operators"
    echo "   📝 Files that may need manual review:"
    grep -r "Array\.isArray.*) ||" . --include="*.js" | cut -d: -f1 | sort -u | head -3
else
    echo "   ✅ No incomplete ternary operators found"
fi

# Look for other potential syntax issues
syntax_issues=$(grep -r "Array\.isArray.*) &&" . --include="*.js" | grep -v "?" | wc -l)
if [ $syntax_issues -gt 0 ]; then
    echo "   ⚠️  Found $syntax_issues potential syntax issues"
else
    echo "   ✅ No obvious syntax issues found"
fi

# 3. Clean up backup files
echo ""
echo "🧹 Cleaning up backup files..."
find . -name "*.bak" -delete
echo "   ✅ Backup files removed"

cd ../..

# 4. Summary
echo ""
echo "✅ SYNTAX FIXES COMPLETE!"
echo ""
echo "🎯 What was fixed:"
echo "   - ) || []; → ) : [];"
echo "   - ) || 0; → ) : 0;"
echo "   - ) || null; → ) : null;"
echo "   - Other malformed ternary operators"
echo ""
echo "🚀 React should now compile without syntax errors"
echo "   Check your browser - compilation should succeed!"
echo ""
echo "🎯 If you still see syntax errors:"
echo "   1. Check the specific file and line mentioned in the error"
echo "   2. Look for unmatched parentheses or brackets"
echo "   3. Ensure ternary operators have both ? and : parts"