# services/users/project/tests/base.py

import os
from flask_testing import TestCase

from project import create_app, db

# Set test environment variables
os.environ['DATABASE_TEST_URL'] = 'postgresql://postgres:postgres@db:5432/testdriven_test'
os.environ['FLASK_ENV'] = 'testing'

app, socketio = create_app()


class BaseTestCase(TestCase):
    def create_app(self):
        app.config.from_object("project.config.TestingConfig")
        return app

    def setUp(self):
        with self.app.app_context():
            # Clean up any existing data
            db.session.rollback()

            # Safe database cleanup - drop tables individually if needed
            try:
                db.drop_all()
            except Exception as e:
                # If drop_all fails due to constraint issues, try manual cleanup
                print(f"Warning: drop_all failed ({e}), attempting manual cleanup...")
                try:
                    # Drop tables in reverse dependency order
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
                    # If manual cleanup also fails, just continue
                    db.session.rollback()

            db.create_all()
            db.session.commit()

    def tearDown(self):
        with self.app.app_context():
            db.session.rollback()
            db.session.remove()
            # Clean teardown - just truncate tables instead of dropping
            try:
                # Truncate all tables to avoid constraint issues
                db.session.execute(db.text("TRUNCATE TABLE meeting_attendance, member_savings, member_fines, group_cashbook, loan_assessments, loan_repayment_schedule, group_loans, group_members, savings_groups, users RESTART IDENTITY CASCADE"))
                db.session.commit()
            except Exception:
                # If truncate fails, just continue
                db.session.rollback()
