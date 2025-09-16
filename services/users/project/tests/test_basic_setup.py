# services/users/project/tests/test_basic_setup.py

import unittest
import os


class TestBasicSetup(unittest.TestCase):
    """Basic tests to verify the environment is set up correctly"""

    def test_python_version(self):
        """Test that Python is working"""
        import sys
        self.assertTrue(sys.version_info >= (3, 11))

    def test_pytest_available(self):
        """Test that pytest is available"""
        try:
            import pytest
            self.assertTrue(hasattr(pytest, '__version__'))
        except ImportError:
            self.fail("pytest is not available")

    def test_flask_available(self):
        """Test that Flask is available"""
        try:
            import flask
            self.assertTrue(hasattr(flask, '__version__'))
        except ImportError:
            self.fail("Flask is not available")

    def test_environment_variables(self):
        """Test that environment variables are set"""
        # These should be set by the workflow
        database_url = os.environ.get('DATABASE_TEST_URL')
        flask_env = os.environ.get('FLASK_ENV')
        
        self.assertIsNotNone(database_url, "DATABASE_TEST_URL should be set")
        self.assertIsNotNone(flask_env, "FLASK_ENV should be set")

    def test_basic_math(self):
        """Test that basic operations work"""
        self.assertEqual(2 + 2, 4)
        self.assertEqual(10 * 5, 50)

    def test_imports_work(self):
        """Test that key imports work without errors"""
        try:
            from project import create_app
            from project.config import TestingConfig
            self.assertTrue(True)  # If we get here, imports worked
        except ImportError as e:
            self.fail(f"Import failed: {e}")


if __name__ == '__main__':
    unittest.main()
