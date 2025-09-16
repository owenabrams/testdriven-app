# services/users/project/tests/base.py

import os
from flask_testing import TestCase

from project import create_app, db

# Force SQLite for tests to avoid PostgreSQL constraint issues
os.environ['DATABASE_TEST_URL'] = 'sqlite:///test.db'
os.environ['FLASK_ENV'] = 'testing'

app, socketio = create_app()


class BaseTestCase(TestCase):
    def create_app(self):
        app.config.from_object("project.config.TestingConfig")
        # Override database URL to use SQLite for tests
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///test.db'
        return app

    def setUp(self):
        with self.app.app_context():
            # Simple SQLite setup - no constraint issues
            db.create_all()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()
