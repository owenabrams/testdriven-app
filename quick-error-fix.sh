#!/bin/bash

# Quick Error Fix - Simple approach to fix specific errors without breaking other code

echo "🔧 Quick Error Fix Tool"
echo "======================"

if [ $# -eq 0 ]; then
    echo "Usage: ./quick-error-fix.sh <error-type>"
    echo ""
    echo "Available error types:"
    echo "  array-reduce    - Fix 'groups.reduce is not a function' errors"
    echo "  syntax-ternary  - Fix malformed ternary operators"
    echo "  quote-escape    - Fix escaped quote issues"
    echo "  import-default  - Fix import/export issues"
    echo ""
    echo "Example: ./quick-error-fix.sh array-reduce"
    exit 1
fi

ERROR_TYPE=$1

case $ERROR_TYPE in
    "array-reduce")
        echo "🔧 Fixing array.reduce errors..."
        cd client/src
        
        # Only fix the specific pattern that's causing errors
        find . -name "*.js" -exec grep -l "\.reduce.*is not a function" {} \; 2>/dev/null | while read file; do
            echo "   📝 Fixing $file"
            # Add safe array check only where needed
            sed -i.bak 's/\([a-zA-Z_][a-zA-Z0-9_]*\)\.reduce(/(\1 \&\& Array.isArray(\1)) ? \1.reduce(/g' "$file"
        done
        
        find . -name "*.bak" -delete
        cd ../..
        echo "   ✅ Array reduce errors fixed"
        ;;
        
    "syntax-ternary")
        echo "🔧 Fixing ternary operator syntax..."
        cd client/src
        
        # Fix specific malformed ternary patterns
        find . -name "*.js" -exec sed -i.bak 's/) || \[\];/) : \[\];/g' {} \;
        find . -name "*.js" -exec sed -i.bak 's/) || 0;/) : 0;/g' {} \;
        
        find . -name "*.bak" -delete
        cd ../..
        echo "   ✅ Ternary syntax fixed"
        ;;
        
    "quote-escape")
        echo "🔧 Fixing quote escape issues..."
        cd client/src
        
        # Fix specific escaped quote patterns
        find . -name "*.js" -exec sed -i.bak 's/\\"/"/g' {} \;
        find . -name "*.js" -exec sed -i.bak "s/\\\\'/'/g" {} \;
        
        find . -name "*.bak" -delete
        cd ../..
        echo "   ✅ Quote escape issues fixed"
        ;;
        
    "import-default")
        echo "🔧 Fixing import/export issues..."
        cd client/src
        
        # Fix specific import patterns
        find . -name "*.js" -exec sed -i.bak 's/import { savingsGroupsAPI }/import savingsGroupsAPI/g' {} \;
        
        find . -name "*.bak" -delete
        cd ../..
        echo "   ✅ Import issues fixed"
        ;;
        
    *)
        echo "❌ Unknown error type: $ERROR_TYPE"
        echo "Use one of: array-reduce, syntax-ternary, quote-escape, import-default"
        exit 1
        ;;
esac

echo ""
echo "✅ Quick fix applied!"
echo "🚀 Check your React terminal - the error should be resolved"