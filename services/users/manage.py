# services/users/manage.py

import sys
import unittest
import coverage

from flask.cli import FlaskGroup

from project import create_app, db
# new
from project.api.models import User  # new

# Initialize coverage
COV = coverage.Coverage(
    branch=True,
    include='project/*',
    omit=[
        'project/tests/*',
        'project/config.py',
    ]
)
COV.start()

app = create_app()  # new
cli = FlaskGroup(create_app=create_app)  # new


@cli.command('recreate_db')
def recreate_db():
    db.drop_all()
    db.create_all()
    db.session.commit()


@cli.command('seed_db')
def seed_db():
    """Seeds the database."""
    db.session.add(User(username='michael', email="hermanmu@gmail.com"))
    db.session.add(User(username='michaelherman', email="michael@mherman.org"))
    db.session.commit()


@cli.command()
def test():
    """Runs the tests without code coverage"""
    tests = unittest.TestLoader().discover('project/tests', pattern='test*.py')
    result = unittest.TextTestRunner(verbosity=2).run(tests)
    if result.wasSuccessful():
        return 0
    sys.exit(result)


@cli.command()
def cov():
    """Runs the unit tests with coverage."""
    tests = unittest.TestLoader().discover('project/tests')
    result = unittest.TextTestRunner(verbosity=2).run(tests)
    if result.wasSuccessful():
        COV.stop()
        COV.save()
        print('\n' + '='*50)
        print('COVERAGE SUMMARY')
        print('='*50)
        COV.report()
        print('\n' + '='*50)
        print('HTML COVERAGE REPORT')
        print('='*50)
        COV.html_report(directory='htmlcov')
        print('HTML coverage report generated in htmlcov/ directory')
        print('Open htmlcov/index.html in your browser to view the detailed report')
        COV.erase()
        return 0
    sys.exit(result)


@cli.command()
def cov_report():
    """Generate coverage report without running tests."""
    COV.load()
    print('\n' + '='*50)
    print('COVERAGE SUMMARY')
    print('='*50)
    COV.report()
    COV.html_report(directory='htmlcov')
    print('\nHTML coverage report generated in htmlcov/ directory')


@cli.command()
def lint():
    """Run flake8 linting."""
    import subprocess
    print('Running flake8...')
    result = subprocess.run(['flake8', 'project'], capture_output=True, text=True)
    if result.returncode == 0:
        print('✅ No linting errors found!')
    else:
        print('❌ Linting errors found:')
        print(result.stdout)
    return result.returncode


@cli.command()
def format_code():
    """Format code with black and isort."""
    import subprocess
    print('Running isort...')
    subprocess.run(['isort', 'project'])
    print('Running black...')
    subprocess.run(['black', 'project'])
    print('✅ Code formatting complete!')


@cli.command()
def format_check():
    """Check if code is properly formatted."""
    import subprocess
    print('Checking isort...')
    isort_result = subprocess.run(['isort', '--check-only', 'project'], capture_output=True)
    print('Checking black...')
    black_result = subprocess.run(['black', '--check', 'project'], capture_output=True)

    if isort_result.returncode == 0 and black_result.returncode == 0:
        print('✅ Code is properly formatted!')
        return 0
    else:
        print('❌ Code formatting issues found. Run "python manage.py format-code" to fix.')
        return 1


if __name__ == '__main__':
    cli()