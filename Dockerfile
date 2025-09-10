# Simple Dockerfile for Savings Groups Platform
FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV FLASK_APP=project/__init__.py
ENV FLASK_ENV=production
ENV APP_SETTINGS=project.config.ProductionConfig
ENV DATABASE_URL=sqlite:///app.db

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy and install Python dependencies first (for better caching)
COPY services/users/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy and build frontend
COPY client/package*.json ./client/
WORKDIR /app/client
RUN npm install

COPY client/ ./
RUN npm run build

# Copy backend code
WORKDIR /app
COPY services/users/ ./services/users/

# Create static directory and copy frontend build
RUN mkdir -p /app/services/users/project/static && \
    cp -r /app/client/build/* /app/services/users/project/static/ 2>/dev/null || true

# Set working directory to backend
WORKDIR /app/services/users

# Create startup script
RUN echo '#!/bin/bash\n\
echo "🚀 Starting Savings Groups Platform..."\n\
echo "🗄️  Initializing database..."\n\
python manage.py recreate_db\n\
python manage.py seed_db\n\
echo "🌱 Seeding demo data..."\n\
python seed_demo_data.py || echo "⚠️  Demo data seeding failed, continuing..."\n\
echo -e "superadmin\\nsuperadmin@testdriven.io\\nsuperpassword123" | python manage.py create_super_admin || echo "⚠️  Super admin creation failed, continuing..."\n\
echo "✅ Database setup complete!"\n\
echo "🌐 Starting Flask server on http://0.0.0.0:5000"\n\
exec python manage.py run --host=0.0.0.0' > /app/services/users/start.sh && \
    chmod +x /app/services/users/start.sh

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:5000/ping || exit 1

# Start Flask application
CMD ["./start.sh"]