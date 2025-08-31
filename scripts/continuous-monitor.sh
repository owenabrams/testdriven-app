#!/bin/bash

# Continuous Monitoring Script
# Monitors system health and automatically fixes common issues

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
MONITOR_INTERVAL=30  # seconds
LOG_FILE="logs/monitor-$(date +%Y%m%d).log"
ALERT_THRESHOLD=3    # consecutive failures before alert

# Ensure logs directory exists
mkdir -p logs

log() {
    echo -e "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Health check functions
check_containers() {
    if docker-compose ps | grep -q "Exit\|unhealthy" 2>/dev/null; then
        return 1
    fi
    return 0
}

check_api_health() {
    curl -s -f http://localhost/users/ping > /dev/null 2>&1
}

check_frontend() {
    curl -s -f http://localhost/ > /dev/null 2>&1
}

check_database() {
    docker-compose exec -T users python -c "
from project import create_app, db
from project.api.models import User
app, _ = create_app()
with app.app_context():
    User.query.first()
" > /dev/null 2>&1
}

# Auto-fix functions
fix_containers() {
    log "${YELLOW}Attempting to restart unhealthy containers...${NC}"
    docker-compose restart
    sleep 10
}

fix_database() {
    log "${YELLOW}Attempting to fix database connection...${NC}"
    docker-compose restart users-db
    sleep 15
    docker-compose restart users
    sleep 10
}

# Alert function
send_alert() {
    local message=$1
    log "${RED}ALERT: $message${NC}"
    
    # You can extend this to send emails, Slack notifications, etc.
    echo "ALERT: $message" >> "logs/alerts-$(date +%Y%m%d).log"
}

# Main monitoring loop
monitor() {
    local consecutive_failures=0
    
    log "${GREEN}Monitoring started (PID: $$)${NC}"
    
    while true; do
        local current_failures=0
        local issues=()
        
        # Check containers
        if ! check_containers; then
            issues+=("Containers unhealthy")
            ((current_failures++))
        fi
        
        # Check API
        if ! check_api_health; then
            issues+=("API not responding")
            ((current_failures++))
        fi
        
        # Check frontend
        if ! check_frontend; then
            issues+=("Frontend not responding")
            ((current_failures++))
        fi
        
        # Check database
        if ! check_database; then
            issues+=("Database connection failed")
            ((current_failures++))
        fi
        
        if [ $current_failures -eq 0 ]; then
            # All checks passed
            if [ $consecutive_failures -gt 0 ]; then
                log "${GREEN}System recovered after $consecutive_failures failures${NC}"
            fi
            consecutive_failures=0
        else
            # Some checks failed
            ((consecutive_failures++))
            log "${YELLOW}Health check failed ($consecutive_failures consecutive): ${issues[*]}${NC}"
            
            # Auto-fix attempts
            if [ $consecutive_failures -eq 1 ]; then
                if [[ " ${issues[*]} " =~ " Containers unhealthy " ]]; then
                    fix_containers
                elif [[ " ${issues[*]} " =~ " Database connection failed " ]]; then
                    fix_database
                fi
            fi
            
            # Send alert if threshold reached
            if [ $consecutive_failures -ge $ALERT_THRESHOLD ]; then
                send_alert "System unhealthy for $consecutive_failures consecutive checks: ${issues[*]}"
            fi
        fi
        
        sleep $MONITOR_INTERVAL
    done
}

# Signal handlers
cleanup() {
    log "${BLUE}Monitoring stopped${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start monitoring
case "${1:-monitor}" in
    monitor)
        monitor
        ;;
    status)
        echo "Checking current system status..."
        if check_containers && check_api_health && check_frontend && check_database; then
            echo -e "${GREEN}✅ System is healthy${NC}"
            exit 0
        else
            echo -e "${RED}❌ System has issues${NC}"
            exit 1
        fi
        ;;
    logs)
        if [ -f "$LOG_FILE" ]; then
            tail -f "$LOG_FILE"
        else
            echo "No log file found for today"
        fi
        ;;
    alerts)
        local alert_file="logs/alerts-$(date +%Y%m%d).log"
        if [ -f "$alert_file" ]; then
            cat "$alert_file"
        else
            echo "No alerts for today"
        fi
        ;;
    *)
        echo "Usage: $0 [monitor|status|logs|alerts]"
        echo "  monitor  - Start continuous monitoring (default)"
        echo "  status   - Check current system status"
        echo "  logs     - Show monitoring logs"
        echo "  alerts   - Show alerts for today"
        exit 1
        ;;
esac
