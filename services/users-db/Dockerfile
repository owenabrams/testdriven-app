# PostgreSQL Database for TestDriven App
FROM postgres:15-alpine

# Set environment variables
ENV POSTGRES_USER=postgres
ENV POSTGRES_PASSWORD=postgres
ENV POSTGRES_DB=users_stage

# Create additional databases for testing
COPY create-databases.sql /docker-entrypoint-initdb.d/

# Expose PostgreSQL port
EXPOSE 5432
