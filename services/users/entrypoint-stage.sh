#!/bin/sh

echo "🔄 Starting production entrypoint..."

echo "⏳ Waiting for postgres..."

# Wait for PostgreSQL to be ready
while ! nc -z users-db 5432; do
  sleep 0.1
done

echo "✅ PostgreSQL started"

# Run database migrations
echo "🗃️  Running database migrations..."
python manage.py recreate_db
python manage.py seed_db

echo "✅ Database migrations completed"

# Start the application server
echo "🚀 Starting Gunicorn server..."
exec gunicorn -b 0.0.0.0:5000 manage:app
