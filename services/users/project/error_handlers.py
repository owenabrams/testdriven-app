"""
Professional Error Handling System for TestDriven Application
Prevents backend crashes and provides graceful error recovery
"""

from flask import jsonify, current_app
import traceback
import logging
from sqlalchemy.exc import SQLAlchemyError
from werkzeug.exceptions import HTTPException


def register_error_handlers(app):
    """Register comprehensive error handlers to prevent crashes"""
    
    @app.errorhandler(Exception)
    def handle_unexpected_error(error):
        """Handle all unexpected errors gracefully"""
        current_app.logger.error(f"Unexpected error: {str(error)}")
        current_app.logger.error(f"Traceback: {traceback.format_exc()}")
        
        # Don't expose internal errors in production
        if current_app.config.get('FLASK_ENV') == 'production':
            return jsonify({
                'status': 'error',
                'message': 'An internal server error occurred'
            }), 500
        else:
            return jsonify({
                'status': 'error',
                'message': str(error),
                'traceback': traceback.format_exc()
            }), 500

    @app.errorhandler(SQLAlchemyError)
    def handle_database_error(error):
        """Handle database errors gracefully"""
        current_app.logger.error(f"Database error: {str(error)}")
        
        # Rollback any pending transaction
        try:
            from project import db
            db.session.rollback()
        except Exception:
            pass
        
        return jsonify({
            'status': 'error',
            'message': 'Database operation failed',
            'details': str(error) if current_app.config.get('FLASK_ENV') != 'production' else None
        }), 500

    @app.errorhandler(HTTPException)
    def handle_http_error(error):
        """Handle HTTP errors gracefully"""
        return jsonify({
            'status': 'error',
            'message': error.description,
            'code': error.code
        }), error.code

    @app.errorhandler(404)
    def handle_not_found(error):
        """Handle 404 errors"""
        return jsonify({
            'status': 'error',
            'message': 'Resource not found'
        }), 404

    @app.errorhandler(400)
    def handle_bad_request(error):
        """Handle 400 errors"""
        return jsonify({
            'status': 'error',
            'message': 'Bad request'
        }), 400

    @app.errorhandler(401)
    def handle_unauthorized(error):
        """Handle 401 errors"""
        return jsonify({
            'status': 'error',
            'message': 'Unauthorized access'
        }), 401

    @app.errorhandler(403)
    def handle_forbidden(error):
        """Handle 403 errors"""
        return jsonify({
            'status': 'error',
            'message': 'Access forbidden'
        }), 403

    @app.errorhandler(500)
    def handle_internal_error(error):
        """Handle 500 errors"""
        current_app.logger.error(f"Internal server error: {str(error)}")
        
        # Rollback any pending transaction
        try:
            from project import db
            db.session.rollback()
        except Exception:
            pass
        
        return jsonify({
            'status': 'error',
            'message': 'Internal server error'
        }), 500

    # Add health check endpoint for monitoring
    @app.route('/health')
    def health_check():
        """Comprehensive health check endpoint"""
        try:
            # Test database connection
            from project import db
            from sqlalchemy import text
            db.session.execute(text('SELECT 1'))
            
            # Test basic functionality
            from project.api.models import User
            user_count = User.query.count()
            
            return jsonify({
                'status': 'healthy',
                'database': 'connected',
                'users': user_count,
                'version': '1.1.0-stable'
            }), 200
            
        except Exception as e:
            current_app.logger.error(f"Health check failed: {str(e)}")
            return jsonify({
                'status': 'unhealthy',
                'error': str(e)
            }), 503

    # Enhanced ping endpoint
    @app.route('/ping')
    def ping():
        """Enhanced ping endpoint with system status"""
        try:
            return jsonify({
                'status': 'success',
                'message': 'pong!',
                'version': '1.1.0-stable',
                'environment': current_app.config.get('FLASK_ENV', 'unknown')
            }), 200
        except Exception as e:
            current_app.logger.error(f"Ping failed: {str(e)}")
            return jsonify({
                'status': 'error',
                'message': 'Service unavailable'
            }), 503


def setup_logging(app):
    """Setup comprehensive logging system"""
    
    # Configure logging format
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s %(levelname)s %(name)s %(message)s'
    )
    
    # Create logger
    logger = logging.getLogger('testdriven')
    logger.setLevel(logging.INFO)
    
    # Add handler for application logs
    handler = logging.StreamHandler()
    handler.setLevel(logging.INFO)
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    
    # Set Flask app logger
    app.logger.addHandler(handler)
    app.logger.setLevel(logging.INFO)
    
    return logger


def create_stability_middleware(app):
    """Create middleware for request/response stability"""
    
    @app.before_request
    def before_request():
        """Pre-request stability checks"""
        try:
            # Log incoming requests in development
            if current_app.config.get('FLASK_ENV') == 'development':
                current_app.logger.info(f"Incoming request: {request.method} {request.path}")
        except Exception as e:
            current_app.logger.error(f"Before request error: {str(e)}")

    @app.after_request
    def after_request(response):
        """Post-request cleanup and logging"""
        try:
            # Ensure database connections are properly closed
            from project import db
            db.session.remove()
            
            # Log response in development
            if current_app.config.get('FLASK_ENV') == 'development':
                current_app.logger.info(f"Response: {response.status_code}")
                
        except Exception as e:
            current_app.logger.error(f"After request error: {str(e)}")
        
        return response

    @app.teardown_appcontext
    def teardown_db(error):
        """Ensure database connections are cleaned up"""
        try:
            from project import db
            db.session.remove()
        except Exception as e:
            current_app.logger.error(f"Teardown error: {str(e)}")


# Import request for middleware
from flask import request
