-- Create additional databases if they don't exist
SELECT 'CREATE DATABASE users_prod' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'users_prod')\gexec
SELECT 'CREATE DATABASE users_test' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'users_test')\gexec