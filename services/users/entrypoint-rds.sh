#!/bin/sh

echo "🔄 Starting production entrypoint with RDS..."

# Extract database host from DATABASE_URL
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')

if [ -z "$DB_HOST" ]; then
    echo "❌ Could not extract database host from DATABASE_URL"
    echo "DATABASE_URL format should be: postgresql://user:pass@host:port/db"
    exit 1
fi

echo "📡 Database host: $DB_HOST"
echo "⏳ Waiting for RDS PostgreSQL to be ready..."

# Wait for RDS to be accessible
while ! nc -z $DB_HOST 5432; do
  echo "⏳ Waiting for RDS at $DB_HOST:5432..."
  sleep 2
done

echo "✅ RDS PostgreSQL is ready!"

# Test database connection
echo "🔍 Testing database connection..."
python -c "
import os
import psycopg2
from urllib.parse import urlparse

try:
    url = urlparse(os.environ['DATABASE_URL'])
    conn = psycopg2.connect(
        host=url.hostname,
        port=url.port,
        user=url.username,
        password=url.password,
        database=url.path[1:]
    )
    conn.close()
    print('✅ Database connection successful')
except Exception as e:
    print(f'❌ Database connection failed: {e}')
    exit(1)
"

# Run database migrations
echo "🗃️  Running database migrations..."
python manage.py recreate_db
python manage.py seed_db

echo "✅ Database migrations completed"

# Start the application server
echo "🚀 Starting Gunicorn server..."
exec gunicorn -b 0.0.0.0:5000 --workers 3 manage:app
