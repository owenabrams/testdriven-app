# Microservices with Docker, Flask, and React

[![CI](https://github.com/YOUR_GITHUB_USERNAME/testdriven-app/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_GITHUB_USERNAME/testdriven-app/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/badge/coverage-83%25-brightgreen.svg)](https://github.com/YOUR_GITHUB_USERNAME/testdriven-app)
[![Code Quality](https://img.shields.io/badge/code%20quality-A-brightgreen.svg)](https://github.com/YOUR_GITHUB_USERNAME/testdriven-app)

> **Note**: Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username in the badges above.

A microservices architecture built with Docker, Flask, and React, featuring comprehensive testing, code coverage, and continuous integration.

## 🚀 Features

- **Microservices Architecture**: Scalable service-oriented design
- **Docker Containerization**: Full containerization with Docker Compose
- **Flask REST API**: RESTful API with Flask and Flask-RESTful
- **PostgreSQL Database**: Robust database with SQLAlchemy ORM
- **Nginx Load Balancer**: Production-ready reverse proxy
- **Comprehensive Testing**: Unit tests with 83% code coverage
- **Code Quality**: Automated linting with flake8, formatting with black
- **Continuous Integration**: GitHub Actions CI/CD pipeline

## 🏗️ Architecture

```
├── services/
│   ├── users/          # User management service
│   ├── nginx/          # Reverse proxy and load balancer
│   └── [future services]
├── scripts/            # Development and deployment scripts
└── .github/workflows/  # CI/CD pipelines
```

## 🛠️ Development Setup

### Prerequisites

- Docker and Docker Compose
- Git

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_GITHUB_USERNAME/testdriven-app.git
   cd testdriven-app
   ```

2. **Build and start services**
   ```bash
   docker-compose up -d --build
   ```

3. **Set up the database**
   ```bash
   docker-compose exec users python manage.py recreate_db
   docker-compose exec users python manage.py seed_db
   ```

4. **Access the application**
   - API: http://localhost
   - Users service: http://localhost:5001

## 🧪 Testing

### Run Tests
```bash
# Run all tests
make test

# Run tests with coverage
make test-cov

# Run specific test file
docker-compose exec users python manage.py test
```

### Code Quality
```bash
# Run linting
make lint

# Format code
make format

# Check formatting
make format-check

# Run all quality checks
make quality
```

## 📊 Available Commands

### Make Commands
- `make build` - Build and start services
- `make test` - Run tests
- `make test-cov` - Run tests with coverage
- `make lint` - Run code linting
- `make format` - Format code
- `make quality` - Run all quality checks

### Development Scripts
```bash
# Quick development commands
./scripts/dev.sh build      # Build services
./scripts/dev.sh test       # Run tests
./scripts/dev.sh test-cov   # Run tests with coverage
./scripts/dev.sh lint       # Run linting
./scripts/dev.sh format     # Format code
./scripts/dev.sh quality    # Run quality checks
```

## 🔄 CI/CD Pipeline

Our GitHub Actions pipeline includes:

1. **Code Quality**: Linting and formatting checks
2. **Testing**: Unit tests with coverage reporting
3. **Integration**: Full service integration testing
4. **Deployment**: Automated deployment (coming soon)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and quality checks (`make quality`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📝 API Documentation

### Users Service Endpoints

- `GET /users/ping` - Health check
- `POST /users` - Create a new user
- `GET /users` - Get all users
- `GET /users/<id>` - Get user by ID

### Example Usage

```bash
# Health check
curl http://localhost/users/ping

# Create user
curl -X POST http://localhost/users \
  -H "Content-Type: application/json" \
  -d '{"username": "john", "email": "john@example.com"}'

# Get all users
curl http://localhost/users
```

## 🚀 Deployment

Coming soon: Production deployment with Docker Swarm and AWS.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Note**: Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username in the badges and URLs.
