# services/users/project/tests/base.py

import os
from flask_testing import TestCase

from project import create_app, db

# Force SQLite for tests to avoid PostgreSQL constraint issues
os.environ['DATABASE_TEST_URL'] = 'sqlite:///test.db'
os.environ['FLASK_ENV'] = 'testing'
# Set the APP_SETTINGS to use TestingConfig
os.environ['APP_SETTINGS'] = 'project.config.TestingConfig'
# Set SECRET_KEY to match GitHub Actions environment
os.environ['SECRET_KEY'] = 'my_precious'


class BaseTestCase(TestCase):
    def create_app(self):
        app, socketio = create_app()
        return app

    def setUp(self):
        with self.app.app_context():
            # Simple SQLite setup - no constraint issues
            db.create_all()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()
