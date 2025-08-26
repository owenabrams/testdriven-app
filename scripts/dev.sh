#!/bin/bash

case "$1" in
  "clean-build")
    echo "🧹 Full clean and rebuild..."
    docker-compose down
    docker system prune -a -f
    docker volume prune -f
    docker-compose up -d --build
    ;;
  "quick-build")
    echo "⚡ Quick rebuild (no cleanup)..."
    docker-compose up -d --build
    ;;
  "restart")
    echo "🔄 Restarting containers..."
    docker-compose restart
    ;;
  "logs")
    echo "📋 Showing logs..."
    docker-compose logs -f
    ;;
  "test")
    echo "🧪 Running tests..."
    docker-compose exec users python manage.py recreate_db
    docker-compose exec users python manage.py test
    ;;
  "test-cov")
    echo "🧪 Running tests with coverage..."
    docker-compose exec users python manage.py recreate_db
    docker-compose exec users python manage.py cov
    ;;
  "lint")
    echo "🔍 Running linter..."
    docker-compose exec users python manage.py lint
    ;;
  "format")
    echo "🎨 Formatting code..."
    docker-compose exec users python manage.py format-code
    ;;
  "format-check")
    echo "🔍 Checking code formatting..."
    docker-compose exec users python manage.py format-check
    ;;
  "quality")
    echo "🔍 Running all quality checks..."
    docker-compose exec users python manage.py lint
    docker-compose exec users python manage.py format-check
    echo "✅ All quality checks complete!"
    ;;
  "shell")
    echo "🐚 Opening shell in users container..."
    docker-compose exec users sh
    ;;
  "status")
    echo "📊 Docker system status:"
    docker system df
    echo ""
    echo "📋 Container status:"
    docker-compose ps
    ;;
  "cleanup")
    echo "🧹 Cleaning up unused Docker resources..."
    docker system prune -f
    docker volume prune -f
    docker image prune -a -f
    echo "✅ Cleanup complete!"
    docker system df
    ;;
  *)
    echo "Usage: $0 {clean-build|quick-build|restart|logs|test|shell|status|cleanup}"
    echo ""
    echo "Commands:"
    echo "  clean-build  - Full cleanup and rebuild"
    echo "  quick-build  - Rebuild without cleanup"
    echo "  restart      - Restart containers"
    echo "  logs         - Show container logs"
    echo "  test         - Run tests"
    echo "  shell        - Open shell in users container"
    echo "  status       - Show Docker space and container status"
    echo "  cleanup      - Clean unused Docker resources"
    ;;
esac