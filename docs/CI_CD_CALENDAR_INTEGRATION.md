# CI/CD Calendar Integration Guide

## Overview

This document explains how the manual calendar data fixes have been integrated into the CI/CD pipeline to ensure automatic resolution in future builds, both offline and online.

## Problem Solved

The manual fixes performed included:
1. **Database Schema Issues**: Missing tables and columns for calendar functionality
2. **Missing Demo Data**: No savings groups, members, or transactions for calendar events
3. **Calendar Event Generation**: Function not returning values and missing data relationships
4. **Database Relationship Conflicts**: Ambiguous joins between tables

## Automated Solutions Implemented

### 1. Database Schema Validation (`services/users/scripts/ensure_database_schema.py`)

**Purpose**: Automatically validates and fixes database schema issues

**Features**:
- ✅ Checks database connection
- ✅ Validates all required tables exist
- ✅ Checks for critical columns (calendar drill-down fields, location fields)
- ✅ Recreates schema if issues are detected
- ✅ Verifies model relationships work correctly
- ✅ Ensures default data (saving types) exists

**Integration**: Called automatically during container startup in `startup.sh`

### 2. Calendar Data Initialization (`services/users/scripts/ensure_calendar_data.py`)

**Purpose**: Ensures calendar functionality has the necessary data

**Features**:
- ✅ Creates basic savings groups if none exist (3 groups: Kampala, Jinja, Mbarara)
- ✅ Creates group members with proper relationships (4 members per group)
- ✅ Creates sample transactions for calendar events
- ✅ Generates calendar events from real transaction data
- ✅ Validates calendar functionality is ready

**Integration**: Called automatically during container startup in `startup.sh`

### 3. Production Data Setup (`scripts/setup-production-data.sh`)

**Purpose**: CI/CD integration script for all environments

**Features**:
- ✅ Environment-specific setup (development, staging, production)
- ✅ Docker container support
- ✅ ECS deployment support
- ✅ Verification and validation
- ✅ Error handling and logging

**Integration**: Called automatically in GitHub Actions workflow

## CI/CD Pipeline Integration

### GitHub Actions Workflow (`.github/workflows/main.yml`)

The workflow now includes automatic data setup steps:

```yaml
- name: Setup Production Data (staging)
  if: github.ref == 'refs/heads/staging'
  env:
    ECS_CLUSTER: testdriven-staging-cluster
    ECS_SERVICE: testdriven-staging-backend
  run: |
    chmod +x scripts/setup-production-data.sh
    ./scripts/setup-production-data.sh staging

- name: Setup Production Data (production)
  if: github.ref == 'refs/heads/production'
  env:
    ECS_CLUSTER: testdriven-production-cluster
    ECS_SERVICE: testdriven-production-backend
  run: |
    chmod +x scripts/setup-production-data.sh
    ./scripts/setup-production-data.sh production
```

### Container Startup Integration (`services/users/startup.sh`)

The startup script now includes:

```bash
# Step 2.5: Ensure database schema is correct
if [ -f "scripts/ensure_database_schema.py" ]; then
    echo "🗄️  Validating database schema..."
    python scripts/ensure_database_schema.py
fi

# Step 4: Ensure calendar data is ready
ensure_calendar_data
```

## Environment-Specific Behavior

### Development/Local Environment
- ✅ Full demo data creation
- ✅ Comprehensive calendar events
- ✅ All filter options populated
- ✅ Complete drill-down functionality

### Staging Environment
- ✅ Production-like data structure
- ✅ Test data for validation
- ✅ Full functionality testing
- ✅ Performance validation

### Production Environment
- ✅ Minimal but functional data
- ✅ Real data structure
- ✅ Calendar functionality ready
- ✅ Professional appearance

## Verification Process

Each deployment automatically verifies:

1. **Database Schema**: All tables and columns exist
2. **Data Relationships**: Model relationships work correctly
3. **Calendar Events**: Events are generated from real data
4. **Filter Options**: All filter categories are populated
5. **API Endpoints**: Calendar APIs return proper data

## Rollback Strategy

If issues are detected:

1. **Schema Issues**: Automatic recreation of database tables
2. **Data Issues**: Regeneration of demo data
3. **Calendar Issues**: Re-execution of calendar event generation
4. **Relationship Issues**: Model relationship validation and repair

## Monitoring and Logging

All scripts provide comprehensive logging:

- 🔍 **Info**: Process steps and status
- ✅ **Success**: Completed operations
- ⚠️ **Warning**: Non-critical issues
- ❌ **Error**: Critical failures requiring attention

## Manual Override

For emergency situations, scripts can be run manually:

```bash
# Local development
./scripts/setup-production-data.sh development

# Docker container
./scripts/setup-production-data.sh production backend-container

# ECS deployment
ECS_CLUSTER=my-cluster ECS_SERVICE=backend ./scripts/setup-production-data.sh production
```

## Future Maintenance

### Adding New Calendar Features

1. Update models in `project/api/models.py`
2. Add schema checks in `ensure_database_schema.py`
3. Update data generation in `ensure_calendar_data.py`
4. Test in development environment
5. Deploy through CI/CD pipeline

### Environment Configuration

Environment-specific settings can be added to:
- `config/environments/development.env`
- `config/environments/staging.env`
- `config/environments/production.env`

## Troubleshooting

### Common Issues

1. **Database Connection Failures**
   - Check DATABASE_URL environment variable
   - Verify database service is running
   - Check network connectivity

2. **Schema Validation Failures**
   - Review migration files
   - Check model definitions
   - Verify database permissions

3. **Calendar Data Generation Failures**
   - Check for existing data conflicts
   - Verify model relationships
   - Review transaction data structure

### Debug Commands

```bash
# Check database status
python -c "from project import create_app, db; app, _ = create_app(); app.app_context().push(); print(f'Tables: {db.engine.table_names()}')"

# Verify calendar events
python -c "from project import create_app, db; from project.api.models import CalendarEvent; app, _ = create_app(); app.app_context().push(); print(f'Events: {CalendarEvent.query.count()}')"

# Test API endpoints
curl -H "Authorization: Bearer TOKEN" http://localhost:5000/api/calendar/filter-options
```

## Success Metrics

The integration is successful when:

- ✅ All deployments complete without manual intervention
- ✅ Calendar functionality works immediately after deployment
- ✅ Advanced filters are populated and functional
- ✅ Event drill-down provides comprehensive information
- ✅ No manual database fixes are required

This comprehensive integration ensures that the Enhanced Savings Groups Management System maintains professional-grade calendar functionality across all environments without manual intervention.
