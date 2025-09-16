# services/users/project/tests/test_config.py

import os
import unittest

from flask import current_app
from flask_testing import TestCase

from project import create_app


class TestDevelopmentConfig(TestCase):
    def create_app(self):
        os.environ['APP_SETTINGS'] = 'project.config.DevelopmentConfig'
        os.environ['DATABASE_URL'] = 'sqlite:///dev.db'
        os.environ['SECRET_KEY'] = 'test-secret-key'
        app, socketio = create_app()
        return app

    def test_app_is_development(self):
        self.assertEqual(
            self.app.config['SECRET_KEY'], os.environ.get('SECRET_KEY')
        )
        self.assertFalse(current_app is None)
        self.assertTrue(
            self.app.config["SQLALCHEMY_DATABASE_URI"] == os.environ.get("DATABASE_URL")
        )
        self.assertTrue(self.app.config["BCRYPT_LOG_ROUNDS"] == 4)
        self.assertTrue(self.app.config['TOKEN_EXPIRATION_DAYS'] == 30)
        self.assertTrue(self.app.config['TOKEN_EXPIRATION_SECONDS'] == 0)


class TestTestingConfig(TestCase):
    def create_app(self):
        os.environ['APP_SETTINGS'] = 'project.config.TestingConfig'
        app, socketio = create_app()
        return app

    def test_app_is_testing(self):
        self.assertEqual(
            self.app.config['SECRET_KEY'], os.environ.get('SECRET_KEY')
        )
        self.assertTrue(self.app.config["TESTING"])
        self.assertFalse(self.app.config["PRESERVE_CONTEXT_ON_EXCEPTION"])
        self.assertTrue(
            self.app.config["SQLALCHEMY_DATABASE_URI"] == os.environ.get("DATABASE_TEST_URL", "sqlite:///test.db")
        )
        self.assertTrue(self.app.config["BCRYPT_LOG_ROUNDS"] == 4)
        self.assertTrue(self.app.config['TOKEN_EXPIRATION_DAYS'] == 0)
        self.assertTrue(self.app.config['TOKEN_EXPIRATION_SECONDS'] == 3)


class TestProductionConfig(TestCase):
    def create_app(self):
        os.environ['APP_SETTINGS'] = 'project.config.ProductionConfig'
        os.environ['DATABASE_URL'] = 'sqlite:///prod.db'
        os.environ['SECRET_KEY'] = 'test-secret-key'
        app, socketio = create_app()
        return app

    def test_app_is_production(self):
        self.assertEqual(
            self.app.config['SECRET_KEY'], os.environ.get('SECRET_KEY')
        )
        self.assertFalse(self.app.config["TESTING"])
        self.assertFalse(self.app.config["DEBUG"])
        self.assertTrue(self.app.config["BCRYPT_LOG_ROUNDS"] == 13)
        self.assertTrue(self.app.config['TOKEN_EXPIRATION_DAYS'] == 30)
        self.assertTrue(self.app.config['TOKEN_EXPIRATION_SECONDS'] == 0)


if __name__ == "__main__":
    unittest.main()
