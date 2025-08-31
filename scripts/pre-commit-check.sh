#!/bin/bash

# Pre-commit Check Script
# Runs before any code changes to ensure they don't break the system

set -e

echo "🔍 PRE-COMMIT CHECKS STARTING..."
echo "==============================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

failed_checks=0

# Function to run a check
run_check() {
    local check_name=$1
    local check_command=$2
    
    echo -n "🔍 $check_name... "
    
    if eval "$check_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS${NC}"
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        return 1
    fi
}

# Syntax checks
echo -e "${BLUE}Syntax Checks${NC}"
echo "============="

# Check Python syntax
if find services/users -name "*.py" -exec python -m py_compile {} \; 2>/dev/null; then
    echo -e "🔍 Python syntax... ${GREEN}✅ PASS${NC}"
else
    echo -e "🔍 Python syntax... ${RED}❌ FAIL${NC}"
    ((failed_checks++))
fi

# Check JavaScript syntax (if Node.js is available)
if command -v node &> /dev/null; then
    if find services/client/src -name "*.js" -o -name "*.jsx" | xargs -I {} node -c {} 2>/dev/null; then
        echo -e "🔍 JavaScript syntax... ${GREEN}✅ PASS${NC}"
    else
        echo -e "🔍 JavaScript syntax... ${RED}❌ FAIL${NC}"
        ((failed_checks++))
    fi
fi

# Configuration checks
echo -e "\n${BLUE}Configuration Checks${NC}"
echo "===================="

# Check Docker Compose syntax
run_check "Docker Compose syntax" "docker-compose config" || ((failed_checks++))

# Check nginx config syntax
run_check "Nginx config syntax" "docker run --rm -v $(pwd)/services/nginx/dev.conf:/etc/nginx/conf.d/default.conf nginx:1.15.9-alpine nginx -t" || ((failed_checks++))

# Check required files exist
echo -e "\n${BLUE}File Existence Checks${NC}"
echo "====================="

required_files=(
    "docker-compose.yml"
    ".env"
    "services/nginx/dev.conf"
    "services/users/manage.py"
    "services/client/package.json"
    "services/client/public/manifest.json"
    "services/client/public/sw-safe.js"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "🔍 $file... ${GREEN}✅ EXISTS${NC}"
    else
        echo -e "🔍 $file... ${RED}❌ MISSING${NC}"
        ((failed_checks++))
    fi
done

# Environment checks
echo -e "\n${BLUE}Environment Checks${NC}"
echo "=================="

# Check .env has required variables
required_vars=("DATABASE_URL" "REACT_APP_USERS_SERVICE_URL" "SECRET_KEY")
for var in "${required_vars[@]}"; do
    if grep -q "^$var=" .env 2>/dev/null; then
        echo -e "🔍 $var in .env... ${GREEN}✅ PASS${NC}"
    else
        echo -e "🔍 $var in .env... ${RED}❌ MISSING${NC}"
        ((failed_checks++))
    fi
done

# Security checks
echo -e "\n${BLUE}Security Checks${NC}"
echo "==============="

# Check for hardcoded secrets (basic check)
if grep -r "password.*=" services/ --include="*.py" --include="*.js" --include="*.jsx" | grep -v "password_hash" | grep -v "test" | grep -q .; then
    echo -e "🔍 Hardcoded passwords... ${RED}❌ FOUND${NC}"
    ((failed_checks++))
else
    echo -e "🔍 Hardcoded passwords... ${GREEN}✅ NONE FOUND${NC}"
fi

# Check for TODO/FIXME comments that might indicate incomplete work
if grep -r "TODO\|FIXME" services/ --include="*.py" --include="*.js" --include="*.jsx" | grep -q .; then
    echo -e "🔍 TODO/FIXME comments... ${YELLOW}⚠️  FOUND${NC}"
    echo "  Consider addressing these before committing:"
    grep -r "TODO\|FIXME" services/ --include="*.py" --include="*.js" --include="*.jsx" | head -5
else
    echo -e "🔍 TODO/FIXME comments... ${GREEN}✅ NONE FOUND${NC}"
fi

# Final report
echo -e "\n${BLUE}PRE-COMMIT CHECK SUMMARY${NC}"
echo "========================"

if [ $failed_checks -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL PRE-COMMIT CHECKS PASSED!${NC}"
    echo "Your changes are ready to be committed."
    exit 0
else
    echo -e "${RED}❌ $failed_checks checks failed.${NC}"
    echo "Please fix the issues above before committing."
    exit 1
fi
