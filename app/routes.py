from flask import Blueprint, render_template, jsonify, current_app
import subprocess
import os

api = Blueprint("api", __name__)

def run_zowe(cmd):
    """Execute a Zowe CLI command and return the output"""
    print(f"Executing: {cmd}")  # Debug logging
    result = subprocess.run(
        cmd, 
        shell=True, 
        stdout=subprocess.PIPE, 
        stderr=subprocess.PIPE, 
        text=True
    )
    
    print(f"Return code: {result.returncode}")  # Debug logging
    print(f"stdout: {result.stdout[:200]}")  # Debug logging
    
    if result.returncode != 0:
        print(f"stderr: {result.stderr}")  # Debug logging
        raise Exception(result.stderr)
    
    return result.stdout


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
        mock_mode = current_app.config.get('MOCK_MODE', True)
        return jsonify({
            "status": "ok",
            "mock_mode": mock_mode,
            "zos_user": os.environ.get('ZOS_USER', 'Not set')
        })

    @app.route("/api/dashboard", methods=["GET"])
    def dashboard_data():
        try:
            # Check if we're in mock mode
            mock_mode = current_app.config.get('MOCK_MODE', True)
            
            # Debug output
            print(f"=" * 50)
            print(f"MOCK_MODE from config: {mock_mode}")
            print(f"MOCK_MODE from env: {os.environ.get('MOCK_MODE')}")
            print(f"ZOS_USER from env: {os.environ.get('ZOS_USER')}")
            print(f"=" * 50)
            
            if mock_mode:
                print("⚠️  Running in MOCK mode")
                return jsonify({
                    "datasets": 45,
                    "jobs_today": 12,
                    "uss_files": 89,
                    "scripts": 23,
                    "mock": True
                })
            
            # Real mainframe data
            user = os.environ.get("ZOS_USER")
            profile = os.environ.get("ZOWE_PROFILE", user)
            
            if not user:
                raise Exception("ZOS_USER environment variable not set")

            print(f"Fetching data for user: {user}, profile: {profile}")

            # Get datasets - use correct Zowe command syntax
            try:
                ds_cmd = f'zowe files list data-set "{user}.*"'
                ds_output = run_zowe(ds_cmd)
                # Count non-empty lines, skip header line
                lines = [line for line in ds_output.splitlines() if line.strip() and not line.startswith('Data Set')]
                dataset_count = len(lines)
            except Exception as e:
                print(f"Error getting datasets: {e}")
                dataset_count = 0

            # Get jobs
            try:
                jobs_cmd = f'zowe jobs list jobs --owner {user}'
                jobs_output = run_zowe(jobs_cmd)
                # Count non-empty lines, skip header line
                lines = [line for line in jobs_output.splitlines() if line.strip() and not line.startswith('JOBID')]
                jobs_today = len(lines)
            except Exception as e:
                print(f"Error getting jobs: {e}")
                jobs_today = 0

            # Get USS files - try multiple path formats
            uss_count = 0
            script_count = 0
            uss_path = None
            
            possible_paths = [
                f'/u/~{user.lower()}',  # With tilde (common on this system)
                f'/u/{user.lower()}',   # Lowercase
                f'/u/{user}',           # Uppercase
            ]
            
            for path in possible_paths:
                try:
                    uss_cmd = f'zowe files list uss-files "{path}"'
                    uss_output = run_zowe(uss_cmd)
                    # Count non-empty lines
                    lines = [line for line in uss_output.splitlines() if line.strip()]
                    uss_count = len(lines)
                    uss_path = path
                    print(f"✅ Found USS directory: {path}")
                    break
                except Exception as e:
                    print(f"USS path {path} not found, trying next...")
                    continue
            
            # Get Scripts - count .rexx, .sh, .py files in USS
            if uss_path:
                try:
                    scripts_cmd = f'zowe files list uss-files "{uss_path}"'
                    scripts_output = run_zowe(scripts_cmd)
                    # Count files with script extensions
                    lines = scripts_output.splitlines()
                    script_count = sum(1 for line in lines if any(ext in line.lower() for ext in ['.rexx', '.sh', '.py', '.jcl']))
                except Exception as e:
                    print(f"Error getting scripts: {e}")
                    script_count = 0
            else:
                print(f"⚠️ No USS directory found for user {user}")

            return jsonify({
                "datasets": dataset_count,
                "jobs_today": jobs_today,
                "uss_files": uss_count,
                "scripts": script_count,
                "mock": False
            })

        except Exception as e:
            # Log the full error for debugging
            import traceback
            error_trace = traceback.format_exc()
            print(f"Error fetching dashboard data:\n{error_trace}")
            
            return jsonify({
                "error": str(e),
                "datasets": 0,
                "jobs_today": 0,
                "uss_files": 0,
                "scripts": 0
            }), 500

    # Blueprint registratie niet meer nodig, of alleen voor andere API endpoints
    # app.register_blueprint(api, url_prefix="/api")