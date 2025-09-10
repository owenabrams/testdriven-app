#!/bin/bash

# Local Docker Development Script
set -e

echo "🐳 Starting Savings Groups Platform locally with Docker"
echo "=================================================="

# Clean up any existing containers
echo "🧹 Cleaning up existing containers..."
docker-compose down 2>/dev/null || true

# Build and start services
echo "🔨 Building and starting services..."
docker-compose up --build -d

echo "⏳ Waiting for application to be ready..."
sleep 30

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    echo "✅ Services are running!"
    echo ""
    echo "🌐 Application URL: http://localhost:5000"
    echo ""
    echo "📋 Demo Users:"
    echo "   Super Admin: superadmin@testdriven.io / superpassword123"
    echo "   Service Admin: admin@savingsgroups.ug / admin123"
    echo "   Group Officer: sarah@kampala.ug / password123"
    echo "   Group Member: alice@kampala.ug / password123"
    echo ""
    echo "🎯 Access Savings Platform: http://localhost:5000/savings-groups"
    echo ""
    echo "📝 To view logs: docker-compose logs -f"
    echo "🛑 To stop: docker-compose down"
    echo ""
    echo "🔍 Health check: curl http://localhost:5000/ping"
else
    echo "❌ Service failed to start. Check logs:"
    docker-compose logs
    exit 1
fi