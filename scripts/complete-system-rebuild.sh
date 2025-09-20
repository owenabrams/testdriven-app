#!/bin/bash

# Complete System Rebuild Script
# Rebuilds all containers with cache clearing for enhanced meeting workflow

set -e  # Exit on any error

echo "🚀 COMPLETE SYSTEM REBUILD - Enhanced Meeting Workflow"
echo "============================================================"

# Function to log with timestamp
log_info() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO] $1"
}

log_error() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [ERROR] $1" >&2
}

log_success() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [SUCCESS] $1"
}

# Step 1: Stop all containers
log_info "Stopping all containers..."
docker-compose down || {
    log_error "Failed to stop containers"
    exit 1
}
log_success "All containers stopped"

# Step 2: Remove all containers and volumes (complete cleanup)
log_info "Removing all containers, networks, and volumes..."
docker-compose down -v --remove-orphans || {
    log_error "Failed to remove containers and volumes"
    exit 1
}
log_success "Containers, networks, and volumes removed"

# Step 3: Clean Docker system (remove unused images, containers, networks)
log_info "Cleaning Docker system..."
docker system prune -a -f || {
    log_error "Failed to clean Docker system"
    exit 1
}
log_success "Docker system cleaned"

# Step 4: Remove node_modules and build artifacts (frontend cache)
log_info "Cleaning frontend cache and build artifacts..."
if [ -d "services/client/node_modules" ]; then
    rm -rf services/client/node_modules
    log_success "Removed node_modules"
fi

if [ -d "services/client/build" ]; then
    rm -rf services/client/build
    log_success "Removed build directory"
fi

if [ -d "services/client/.next" ]; then
    rm -rf services/client/.next
    log_success "Removed .next directory"
fi

# Step 5: Clean Python cache (backend cache)
log_info "Cleaning Python cache..."
find services/users -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
find services/users -name "*.pyc" -delete 2>/dev/null || true
log_success "Python cache cleaned"

# Step 6: Rebuild backend container (no cache)
log_info "Rebuilding backend container..."
docker-compose build --no-cache backend || {
    log_error "Failed to rebuild backend container"
    exit 1
}
log_success "Backend container rebuilt"

# Step 7: Rebuild frontend container (no cache)
log_info "Rebuilding frontend container..."
docker-compose build --no-cache frontend || {
    log_error "Failed to rebuild frontend container"
    exit 1
}
log_success "Frontend container rebuilt"

# Step 8: Start database first
log_info "Starting database container..."
docker-compose up -d db || {
    log_error "Failed to start database"
    exit 1
}

# Wait for database to be ready
log_info "Waiting for database to be ready..."
sleep 10

# Step 9: Start backend container
log_info "Starting backend container..."
docker-compose up -d backend || {
    log_error "Failed to start backend"
    exit 1
}

# Wait for backend to be ready
log_info "Waiting for backend to be ready..."
sleep 15

# Step 10: Initialize enhanced meeting workflow
log_info "Initializing enhanced meeting workflow..."
docker exec testdriven-appcopy-backend-1 python -c "
from project import create_app, db
from project.api.models import GroupConstitution, Meeting
from project.api.attendance_models import AttendanceSession, AttendanceRecord

app = create_app()
if isinstance(app, tuple):
    app = app[0]

with app.app_context():
    print('Creating attendance management tables...')
    db.create_all()
    print('Attendance tables created successfully!')
" || {
    log_error "Failed to create attendance tables"
    exit 1
}

# Step 11: Run meeting workflow initialization
log_info "Running meeting workflow initialization..."
docker exec testdriven-appcopy-backend-1 python scripts/initialize_meeting_workflow.py || {
    log_error "Failed to initialize meeting workflow"
    exit 1
}

# Step 12: Start frontend container
log_info "Starting frontend container..."
docker-compose up -d frontend || {
    log_error "Failed to start frontend"
    exit 1
}

# Step 13: Wait for all services to be ready
log_info "Waiting for all services to be ready..."
sleep 20

# Step 14: Health checks
log_info "Performing health checks..."

# Check backend health
backend_health=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/ping || echo "000")
if [ "$backend_health" = "200" ]; then
    log_success "Backend health check passed"
else
    log_error "Backend health check failed (HTTP $backend_health)"
fi

# Check frontend health
frontend_health=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "000")
if [ "$frontend_health" = "200" ]; then
    log_success "Frontend health check passed"
else
    log_error "Frontend health check failed (HTTP $frontend_health)"
fi

# Step 15: Test enhanced meeting workflow APIs
log_info "Testing enhanced meeting workflow APIs..."

# Test constitution API
constitution_test=$(curl -s -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NjA4NTM3MzcsImlhdCI6MTc1ODI2MTczNywic3ViIjoxMX0.le6iDKTDACp-APJ8zoM65xo1OOJfONWq3e_CJ1qhfX4" "http://localhost:5000/api/groups/1/constitution" | jq -r '.status' 2>/dev/null || echo "error")

if [ "$constitution_test" = "success" ]; then
    log_success "Constitution API test passed"
else
    log_error "Constitution API test failed"
fi

# Test meetings API
meetings_test=$(curl -s -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NjA4NTM3MzcsImlhdCI6MTc1ODI2MTczNywic3ViIjoxMX0.le6iDKTDACp-APJ8zoM65xo1OOJfONWq3e_CJ1qhfX4" "http://localhost:5000/api/groups/1/meetings" | jq -r '.status' 2>/dev/null || echo "error")

if [ "$meetings_test" = "success" ]; then
    log_success "Meetings API test passed"
else
    log_error "Meetings API test failed"
fi

# Step 16: Display system status
echo ""
echo "============================================================"
echo "🎉 COMPLETE SYSTEM REBUILD FINISHED!"
echo "============================================================"

# Container status
log_info "Container Status:"
docker-compose ps

echo ""
log_info "System URLs:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:5000"
echo "   Database: localhost:5432"

echo ""
log_info "Enhanced Meeting Workflow Features:"
echo "   ✅ Group Constitutions with governance rules"
echo "   ✅ Professional meeting management"
echo "   ✅ Complete attendance tracking system"
echo "   ✅ QR code and location-based check-in"
echo "   ✅ Meeting workflow automation"
echo "   ✅ Leadership role management"
echo "   ✅ Democratic voting system"
echo "   ✅ Financial transaction integration"

echo ""
log_info "API Endpoints Available:"
echo "   Constitution: GET/POST /api/groups/{id}/constitution"
echo "   Meetings: GET/POST /api/groups/{id}/meetings"
echo "   Attendance: POST /api/meetings/{id}/attendance/session"
echo "   Check-in: POST /api/attendance/check-in"
echo "   QR Check-in: POST /api/attendance/qr-check-in"

echo ""
if [ "$backend_health" = "200" ] && [ "$frontend_health" = "200" ] && [ "$constitution_test" = "success" ] && [ "$meetings_test" = "success" ]; then
    log_success "🎉 ALL SYSTEMS OPERATIONAL - Enhanced Meeting Workflow Ready!"
    echo ""
    echo "🚀 Your Enhanced Savings Groups Management System is now running with:"
    echo "   • Professional meeting workflow management"
    echo "   • World-class attendance tracking"
    echo "   • Complete governance framework"
    echo "   • Real-time financial integration"
    echo "   • Mobile-ready check-in system"
    echo ""
    echo "Ready for professional savings group management! 🎯"
    exit 0
else
    log_error "⚠️  Some systems may not be fully operational. Check the logs above."
    exit 1
fi
