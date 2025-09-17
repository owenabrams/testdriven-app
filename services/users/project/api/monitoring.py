# services/users/project/api/monitoring.py
"""
Aurora PostgreSQL Monitoring API Endpoints
Provides monitoring and health check endpoints for Aurora database
"""

from flask import Blueprint, jsonify, request
from sqlalchemy import text

from project import db
from project.monitoring import aurora_monitor, get_monitoring_data
from project.aurora_config import aurora_config

monitoring_blueprint = Blueprint('monitoring', __name__)

# Simple monitoring endpoints without flask-restx dependency
@monitoring_blueprint.route('/monitoring/health', methods=['GET'])
def health():
    """Simple health check endpoint"""
    try:
        health_data = aurora_monitor.get_health_status()
        return jsonify({
            'status': 'success',
            'data': health_data
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@monitoring_blueprint.route('/monitoring/connection-test', methods=['GET'])
def connection_test():
    """Test database connection"""
    try:
        # Test write connection
        with db.engine.connect() as conn:
            # Use compatible SQL for both SQLite and PostgreSQL
            if 'sqlite' in str(db.engine.url):
                result = conn.execute(text("SELECT 1 as test, datetime('now') as timestamp"))
            else:
                result = conn.execute(text("SELECT 1 as test, NOW() as timestamp"))
            row = result.fetchone()

            write_test = {
                'status': 'success',
                'test_value': row[0],
                'timestamp': str(row[1]),
                'endpoint': 'write'
            }

        # Test read connection if available
        read_test = None
        if aurora_config.is_aurora_environment():
            reader_uri = aurora_config.get_reader_uri()
            if reader_uri != aurora_config.get_database_uri():
                # We have a separate reader endpoint
                read_test = {
                    'status': 'available',
                    'endpoint': 'read',
                    'message': 'Reader endpoint configured'
                }
            else:
                read_test = {
                    'status': 'using_write',
                    'endpoint': 'read',
                    'message': 'Using write endpoint for reads'
                }
        else:
            read_test = {
                'status': 'local_db',
                'endpoint': 'read',
                'message': 'Using local database'
            }

        return jsonify({
            'status': 'success',
            'data': {
                'write_connection': write_test,
                'read_connection': read_test,
                'aurora_environment': aurora_config.is_aurora_environment(),
                'database_type': 'sqlite' if 'sqlite' in str(db.engine.url) else 'postgresql'
            }
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Connection test failed: {str(e)}'
        }), 500

@monitoring_blueprint.route('/monitoring/metrics', methods=['GET'])
def metrics():
    """Get detailed database metrics (Admin only)"""
    # For now, return 401 to indicate authentication required
    # In a real app, you'd check authentication here
    return jsonify({
        'status': 'error',
        'message': 'Authentication required'
    }), 401

@monitoring_blueprint.route('/monitoring/alerts', methods=['GET'])
def alerts():
    """Get current database alerts (Admin only)"""
    # For now, return 401 to indicate authentication required
    # In a real app, you'd check authentication here
    return jsonify({
        'status': 'error',
        'message': 'Authentication required'
    }), 401

@monitoring_blueprint.route('/monitoring/ping', methods=['GET'])
def ping():
    """Simple ping endpoint for load balancers"""
    try:
        # Quick database connectivity test
        with db.engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        
        return jsonify({
            'status': 'healthy',
            'message': 'Aurora PostgreSQL is responding',
            'timestamp': aurora_monitor.metrics_history[-1].timestamp.isoformat() if aurora_monitor.metrics_history else None
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'message': f'Database connection failed: {str(e)}'
        }), 503
