.PHONY: build clean-build quick-build test logs shell status cleanup help

# Default target
help:
	@echo "Available commands:"
	@echo "  build        - Clean build (removes unused resources first)"
	@echo "  quick-build  - Build without cleanup"
	@echo "  test         - Run tests"
	@echo "  logs         - Show container logs"
	@echo "  shell        - Open shell in users container"
	@echo "  status       - Show Docker space and container status"
	@echo "  cleanup      - Clean unused Docker resources"
	@echo "  stop         - Stop all containers"

# Clean build with automatic cleanup
build: cleanup
	@echo "🔨 Building containers..."
	docker-compose up -d --build
	@echo "✅ Build complete!"
	@$(MAKE) status

# Quick build without cleanup
quick-build:
	@echo "⚡ Quick build..."
	docker-compose up -d --build

# Cleanup unused Docker resources
cleanup:
	@echo "🧹 Cleaning up Docker resources..."
	docker-compose down 2>/dev/null || true
	docker system prune -f
	docker volume prune -f
	docker image prune -a -f

# Run tests
test:
	docker-compose exec users python manage.py recreate_db
	docker-compose exec users python manage.py test

# Run tests with coverage
test-cov:
	docker-compose exec users python manage.py recreate_db
	docker-compose exec users python manage.py cov

# Code quality
lint:
	docker-compose exec users python manage.py lint

format:
	docker-compose exec users python manage.py format-code

format-check:
	docker-compose exec users python manage.py format-check

# Run all quality checks
quality: lint format-check
	@echo "✅ All quality checks passed!"

# Show logs
logs:
	docker-compose logs -f

# Open shell
shell:
	docker-compose exec users sh

# Show status
status:
	@echo "📊 Docker space usage:"
	docker system df
	@echo ""
	@echo "📋 Container status:"
	docker-compose ps

# Stop containers
stop:
	docker-compose down