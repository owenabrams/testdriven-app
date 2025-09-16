# services/users/project/tests/base.py

import os
from flask_testing import TestCase

from project import create_app, db

# Set test environment variables for CI
os.environ['DATABASE_TEST_URL'] = os.environ.get('DATABASE_TEST_URL', 'sqlite:///test.db')
os.environ['FLASK_ENV'] = 'testing'

app, socketio = create_app()


class BaseTestCase(TestCase):
    def create_app(self):
        app.config.from_object("project.config.TestingConfig")
        return app

    def setUp(self):
        with self.app.app_context():
            # Ultra-simple, bulletproof setup
            try:
                db.session.rollback()
                # Try to drop all tables, but don't fail if constraints exist
                try:
                    db.drop_all()
                except Exception as drop_error:
                    # If drop fails due to constraints, manually drop tables
                    print(f"Drop warning: {drop_error}, using manual cleanup...")
                    try:
                        # Drop tables in safe order to avoid constraint issues
                        db.session.execute(db.text("DROP TABLE IF EXISTS meeting_attendance CASCADE"))
                        db.session.execute(db.text("DROP TABLE IF EXISTS member_savings CASCADE"))
                        db.session.execute(db.text("DROP TABLE IF EXISTS member_fines CASCADE"))
                        db.session.execute(db.text("DROP TABLE IF EXISTS group_cashbook CASCADE"))
                        db.session.execute(db.text("DROP TABLE IF EXISTS loan_assessments CASCADE"))
                        db.session.execute(db.text("DROP TABLE IF EXISTS loan_repayment_schedule CASCADE"))
                        db.session.execute(db.text("DROP TABLE IF EXISTS group_loans CASCADE"))
                        db.session.execute(db.text("DROP TABLE IF EXISTS group_members CASCADE"))
                        db.session.execute(db.text("DROP TABLE IF EXISTS savings_groups CASCADE"))
                        db.session.execute(db.text("DROP TABLE IF EXISTS users CASCADE"))
                        db.session.commit()
                    except Exception:
                        db.session.rollback()

                # Always create fresh tables
                db.create_all()
                db.session.commit()
            except Exception as e:
                print(f"Setup error: {e}")
                db.session.rollback()
                # Last resort: just try to create tables
                try:
                    db.create_all()
                    db.session.commit()
                except Exception:
                    db.session.rollback()

    def tearDown(self):
        with self.app.app_context():
            try:
                db.session.rollback()
                db.session.remove()
            except Exception:
                pass
