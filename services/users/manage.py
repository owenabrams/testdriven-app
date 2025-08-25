# services/users/manage.py
# Next, let's configure the Flask CLI tool to run and manage the app from the command line. Feel free to replace the Flask CLI tool with Flask Script if that's what you're used to. Just keep in mind that it is deprecated.

'''
Here, we created a new FlaskGroup instance to extend the normal CLI with commands related to the Flask app.

Run the server from the "users" directory:

(env)$ export FLASK_APP=project/__init__.py
(env)$ python manage.py run
Navigate to http://localhost:5000/users/ping in your browser. You should see:

{
  "message": "pong!",
  "status": "success"
}

Kill the server and add a new file called config.py to the "project" directory:
'''

from flask.cli import FlaskGroup

from project import app


cli = FlaskGroup(app)


if __name__ == '__main__':
    cli()