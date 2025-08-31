#!/bin/bash

# Create Comprehensive Backup Script
# Creates local archive backup of the entire project

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BACKUP_DIR="backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
PROJECT_NAME="testdriven-app"
BACKUP_NAME="${PROJECT_NAME}-${TIMESTAMP}"

echo -e "${BLUE}🛡️  CREATING COMPREHENSIVE BACKUP${NC}"
echo -e "${BLUE}=================================${NC}"
echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Get current git info
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
CURRENT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
CURRENT_TAG=$(git describe --tags --exact-match 2>/dev/null || echo "no-tag")

echo -e "${YELLOW}Backup Information:${NC}"
echo "  Name: $BACKUP_NAME"
echo "  Branch: $CURRENT_BRANCH"
echo "  Commit: $CURRENT_COMMIT"
echo "  Tag: $CURRENT_TAG"
echo "  Timestamp: $TIMESTAMP"
echo ""

# Create backup metadata
cat > "$BACKUP_DIR/${BACKUP_NAME}-info.txt" << EOF
TESTDRIVEN-APP BACKUP INFORMATION
================================

Backup Name: $BACKUP_NAME
Created: $(date)
Git Branch: $CURRENT_BRANCH
Git Commit: $CURRENT_COMMIT
Git Tag: $CURRENT_TAG

System Information:
- Docker Version: $(docker --version 2>/dev/null || echo "Not available")
- Docker Compose Version: $(docker-compose --version 2>/dev/null || echo "Not available")
- OS: $(uname -s)
- Architecture: $(uname -m)

Backup Contents:
- All source code
- Configuration files
- Scripts and documentation
- Git history
- Docker configurations

NOT INCLUDED:
- Environment secrets (.env)
- Log files
- Temporary files
- Node modules
- Database data (backup separately)

Restore Instructions:
1. Extract: tar -xzf ${BACKUP_NAME}.tar.gz
2. Navigate: cd $PROJECT_NAME
3. Setup: ./scripts/auto-setup.sh
4. Verify: ./scripts/health-check.sh
EOF

echo -e "${YELLOW}Creating archive backup...${NC}"

# Create tar archive excluding unnecessary files
tar -czf "$BACKUP_DIR/${BACKUP_NAME}.tar.gz" \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='logs' \
    --exclude='backups' \
    --exclude='*.log' \
    --exclude='.env' \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='build' \
    --exclude='dist' \
    --exclude='.cache' \
    --exclude='coverage' \
    --exclude='.pytest_cache' \
    --exclude='*.tmp' \
    --exclude='*.temp' \
    --exclude='.DS_Store' \
    --exclude='Thumbs.db' \
    .

# Get backup size
BACKUP_SIZE=$(du -h "$BACKUP_DIR/${BACKUP_NAME}.tar.gz" | cut -f1)

echo -e "${GREEN}✅ Backup created successfully!${NC}"
echo ""
echo -e "${BLUE}Backup Details:${NC}"
echo "  File: $BACKUP_DIR/${BACKUP_NAME}.tar.gz"
echo "  Size: $BACKUP_SIZE"
echo "  Info: $BACKUP_DIR/${BACKUP_NAME}-info.txt"
echo ""

# Create git backup (if git is available)
if git status >/dev/null 2>&1; then
    echo -e "${YELLOW}Creating git bundle backup...${NC}"
    git bundle create "$BACKUP_DIR/${BACKUP_NAME}.bundle" --all
    echo -e "${GREEN}✅ Git bundle created!${NC}"
    echo "  Bundle: $BACKUP_DIR/${BACKUP_NAME}.bundle"
    echo ""
fi

# Database backup (if containers are running)
if docker-compose ps | grep -q "users-db.*Up"; then
    echo -e "${YELLOW}Creating database backup...${NC}"
    docker-compose exec -T users-db pg_dump -U postgres users_dev > "$BACKUP_DIR/${BACKUP_NAME}-database.sql" 2>/dev/null || {
        echo -e "${YELLOW}⚠️  Database backup failed (container may not be running)${NC}"
    }
    if [ -f "$BACKUP_DIR/${BACKUP_NAME}-database.sql" ]; then
        echo -e "${GREEN}✅ Database backup created!${NC}"
        echo "  Database: $BACKUP_DIR/${BACKUP_NAME}-database.sql"
        echo ""
    fi
fi

# Create restore script
cat > "$BACKUP_DIR/${BACKUP_NAME}-restore.sh" << 'EOF'
#!/bin/bash

# Automated Restore Script
# Generated with backup

set -e

BACKUP_NAME=$(basename "$0" | sed 's/-restore.sh//')
BACKUP_DIR=$(dirname "$0")

echo "🔄 Restoring from backup: $BACKUP_NAME"
echo "======================================"

# Extract backup
if [ -f "$BACKUP_DIR/${BACKUP_NAME}.tar.gz" ]; then
    echo "Extracting backup archive..."
    tar -xzf "$BACKUP_DIR/${BACKUP_NAME}.tar.gz"
    echo "✅ Archive extracted"
else
    echo "❌ Backup archive not found!"
    exit 1
fi

# Navigate to project directory
cd testdriven-app 2>/dev/null || {
    echo "❌ Project directory not found after extraction!"
    exit 1
}

# Make scripts executable
chmod +x scripts/*.sh

# Run automated setup
echo "Running automated setup..."
./scripts/auto-setup.sh

# Restore database if backup exists
if [ -f "$BACKUP_DIR/${BACKUP_NAME}-database.sql" ]; then
    echo "Restoring database..."
    docker-compose exec -T users-db psql -U postgres -d users_dev < "$BACKUP_DIR/${BACKUP_NAME}-database.sql" || {
        echo "⚠️  Database restore failed - you may need to recreate it"
    }
fi

# Verify restoration
echo "Verifying restoration..."
./scripts/health-check.sh

echo "🎉 Restore completed!"
EOF

chmod +x "$BACKUP_DIR/${BACKUP_NAME}-restore.sh"

# Summary
echo -e "${BLUE}📋 BACKUP SUMMARY${NC}"
echo -e "${BLUE}=================${NC}"
echo -e "${GREEN}✅ Archive backup: ${BACKUP_SIZE}${NC}"
echo -e "${GREEN}✅ Metadata file created${NC}"
echo -e "${GREEN}✅ Restore script created${NC}"
if [ -f "$BACKUP_DIR/${BACKUP_NAME}.bundle" ]; then
    echo -e "${GREEN}✅ Git bundle created${NC}"
fi
if [ -f "$BACKUP_DIR/${BACKUP_NAME}-database.sql" ]; then
    echo -e "${GREEN}✅ Database backup created${NC}"
fi
echo ""

echo -e "${YELLOW}📁 Backup Files:${NC}"
ls -la "$BACKUP_DIR/${BACKUP_NAME}"*
echo ""

echo -e "${BLUE}🔄 To restore this backup:${NC}"
echo "  ./$BACKUP_DIR/${BACKUP_NAME}-restore.sh"
echo ""

echo -e "${GREEN}🛡️  Backup completed successfully!${NC}"
