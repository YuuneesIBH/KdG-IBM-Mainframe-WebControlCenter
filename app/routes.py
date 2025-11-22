from flask import render_template, jsonify

def init_routes(app):
    @app.route("/")
    def index():
        return render_template("index.html")
    
    @app.route("/datasets")
    def datasets():
        return render_template("datasets.html")
    
    @app.route("/editor")
    def editor():
        return render_template("editor.html")
    
    @app.route("/jobs")
    def jobs():
        return render_template("jobs.html")
    
    @app.route("/uss")
    def uss():
        return render_template("uss.html")
    
    @app.route("/api/health")
    def api_health():
        return jsonify({
            "status": "ok",
            "mock_mode": True
        })