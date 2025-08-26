#!/bin/bash

# Production monitoring script
COMPOSE_FILE="docker-compose.prod.yml"
LOG_FILE="/var/log/app-monitor.log"

echo "📊 Production System Status - $(date)" | tee -a $LOG_FILE

# Check container health
echo "🐳 Container Status:" | tee -a $LOG_FILE
docker-compose -f $COMPOSE_FILE ps | tee -a $LOG_FILE

# Check resource usage
echo "💾 Resource Usage:" | tee -a $LOG_FILE
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" | tee -a $LOG_FILE

# Check disk space
echo "💿 Disk Usage:" | tee -a $LOG_FILE
df -h | grep -E "(Filesystem|/dev/)" | tee -a $LOG_FILE

# Check Docker space
echo "🐋 Docker Space:" | tee -a $LOG_FILE
docker system df | tee -a $LOG_FILE

# Health check
echo "🏥 Health Check:" | tee -a $LOG_FILE
if curl -f -s http://localhost/health > /dev/null; then
    echo "✅ Application is healthy" | tee -a $LOG_FILE
else
    echo "❌ Application health check failed!" | tee -a $LOG_FILE
    # Send alert (integrate with your monitoring system)
    # curl -X POST "https://hooks.slack.com/..." -d '{"text":"App health check failed!"}'
fi

# Cleanup if disk usage is high
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "⚠️  High disk usage ($DISK_USAGE%), cleaning up..." | tee -a $LOG_FILE
    docker system prune -f
    docker image prune -a -f
fi

echo "---" | tee -a $LOG_FILE