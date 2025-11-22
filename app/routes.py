from flask import render_template

def init_routes(app):
    @app.route("/")
    def index():
        return "<h1>KdG Mainframe Web Control Center</h1><p>App is running.</p>"