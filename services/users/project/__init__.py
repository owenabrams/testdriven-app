# services/users/project/__init__.py

import os

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_migrate import Migrate
from flask_bcrypt import Bcrypt
from flask_socketio import SocketIO

# instantiate the extensions
db = SQLAlchemy()
cors = CORS()
migrate = Migrate()
bcrypt = Bcrypt()
socketio = SocketIO()


# new
def create_app(script_info=None):

    # instantiate the app
    app = Flask(__name__)

    # set config
    app_settings = os.getenv("APP_SETTINGS")
    app.config.from_object(app_settings)

    # set up extensions
    db.init_app(app)
    cors.init_app(app)
    migrate.init_app(app, db)
    bcrypt.init_app(app)
    socketio.init_app(app, cors_allowed_origins="*")

    # Initialize professional error handling and stability system
    from project.error_handlers import register_error_handlers, setup_logging, create_stability_middleware
    register_error_handlers(app)
    setup_logging(app)
    create_stability_middleware(app)

    # register blueprints
    from project.api.users import users_blueprint
    from project.api.auth import auth_blueprint
    from project.api.admin import admin_blueprint
    from project.api.notifications import notifications_blueprint
    from project.api.savings_groups import savings_groups_blueprint
    from project.api.calendar import calendar_blueprint

    app.register_blueprint(users_blueprint)
    app.register_blueprint(auth_blueprint)
    app.register_blueprint(admin_blueprint)
    app.register_blueprint(notifications_blueprint)
    app.register_blueprint(savings_groups_blueprint)
    app.register_blueprint(calendar_blueprint)

    # register socketio events for real-time features
    from project.api import socketio_events

    # Health check endpoint is now handled by error_handlers.py

    # shell context for flask cli
    @app.shell_context_processor
    def ctx():
        return {"app": app, "db": db}

    return app, socketio
