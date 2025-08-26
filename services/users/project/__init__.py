# services/users/project/__init__.py
# Add an __init__.py file to the "project" directory and configure the first route:


from flask import Flask, jsonify
from flask_restful import Resource, Api


# instantiate the app
app = Flask(__name__)

api = Api(app)

# set config
app.config.from_object('project.config.DevelopmentConfig')  # new - Update __init__.py to pull in the development config on init:
# After update above, Run the app again. This time, let's enable debug mode by setting the FLASK_ENV environment variable to development:


class UsersPing(Resource):
    def get(self):
        return {
        'status': 'success',
        'message': 'pong!'
    }


api.add_resource(UsersPing, '/users/ping')

# Next, let's configure the Flask CLI tool to run and manage the app from the command line.

# New to Flask-RESTful? Review the Quickstart guide. If you don't understand the code above, then go to this link: "https://flask-restful.readthedocs.io/en/latest/quickstart.html"