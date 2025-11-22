from flask import render_template, jsonify

def init_routes(app):
    @app.route("/")
    def index():
        return render_template("index.html")
    
    @app.route("/datasets")
    def datasets():
        return render_template("datasets.html")
    
    @app.route("/api/health")
    def api_health():
        return jsonify({
            "status": "ok",
            "mock_mode": True
        })