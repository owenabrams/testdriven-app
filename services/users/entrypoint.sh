#!/bin/sh

echo "Waiting for postgres..."

# Wait for postgres to be ready
until nc -z users-db 5432; do
  echo "Postgres is unavailable - sleeping"
  sleep 1
done

echo "Postgres is up - executing command"

# Wait a bit more to ensure postgres is fully ready
sleep 2

python -c "
from project import create_app, socketio
app, socketio = create_app()
socketio.run(app, host='0.0.0.0', port=5000, debug=True, allow_unsafe_werkzeug=True)
"