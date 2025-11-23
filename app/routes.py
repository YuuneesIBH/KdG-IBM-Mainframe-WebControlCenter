from flask import Blueprint, render_template, jsonify, current_app
import subprocess
import os

api = Blueprint("api", __name__)

def run_zowe(cmd):
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

            try:
                ds_cmd = f'zowe files list data-set "{user}.*"'
                ds_output = run_zowe(ds_cmd)
                # Count non-empty lines, skip header line
                lines = [line for line in ds_output.splitlines() if line.strip() and not line.startswith('Data Set')]
                dataset_count = len(lines)
            except Exception as e:
                print(f"Error getting datasets: {e}")
                dataset_count = 0

            try:
                jobs_cmd = f'zowe jobs list jobs --owner {user}'
                jobs_output = run_zowe(jobs_cmd)
                # Count non-empty lines, skip header line
                lines = [line for line in jobs_output.splitlines() if line.strip() and not line.startswith('JOBID')]
                jobs_today = len(lines)
            except Exception as e:
                print(f"Error getting jobs: {e}")
                jobs_today = 0

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

    @app.route("/api/datasets/list", methods=["GET"])
    def list_datasets():
        try:
            from flask import request
            hlq = request.args.get('hlq', '').strip()
            
            if not hlq:
                return jsonify({"error": "HLQ parameter is required"}), 400
            
            mock_mode = current_app.config.get('MOCK_MODE', True)
            
            if mock_mode:
                return jsonify({
                    "datasets": [
                        {"name": f"{hlq}.JCL", "type": "PDS", "members": 15},
                        {"name": f"{hlq}.SOURCE", "type": "PDS", "members": 8},
                        {"name": f"{hlq}.LOAD", "type": "PDS", "members": 5},
                        {"name": f"{hlq}.OUTPUT", "type": "PS", "members": 0},
                        {"name": f"{hlq}.INPUT", "type": "PS", "members": 0},
                    ],
                    "mock": True
                })
            
            user = os.environ.get("ZOS_USER")
            cmd = f'zowe files list data-set "{hlq}.*"'
            output = run_zowe(cmd)
            
            datasets = []
            for line in output.splitlines():
                line = line.strip()
                if line and not line.startswith('Data Set'):
                    # Parse dataset name
                    parts = line.split()
                    if parts:
                        ds_name = parts[0]
                        # Determine if PDS or PS (simplified)
                        ds_type = "PDS" if any(x in ds_name.upper() for x in ['JCL', 'SOURCE', 'LOAD', 'LIB']) else "PS"
                        datasets.append({
                            "name": ds_name,
                            "type": ds_type,
                            "members": 0  # Will be fetched when clicking on PDS
                        })
            
            return jsonify({
                "datasets": datasets,
                "mock": False
            })
            
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"Error listing datasets:\n{error_trace}")
            return jsonify({"error": str(e)}), 500

    @app.route("/api/datasets/members", methods=["GET"])
    def list_members():
        try:
            from flask import request
            dataset = request.args.get('dataset', '').strip()
            
            if not dataset:
                return jsonify({"error": "Dataset parameter is required"}), 400
            
            mock_mode = current_app.config.get('MOCK_MODE', True)
            
            if mock_mode:
                return jsonify({
                    "members": [
                        {"name": "MEMBER01", "created": "2024-01-15", "modified": "2024-01-20"},
                        {"name": "MEMBER02", "created": "2024-01-16", "modified": "2024-01-21"},
                        {"name": "COMPILE", "created": "2024-01-17", "modified": "2024-01-22"},
                        {"name": "HELLO", "created": "2024-01-18", "modified": "2024-01-23"},
                    ],
                    "mock": True
                })
            
            cmd = f'zowe files list all-members "{dataset}"'
            output = run_zowe(cmd)
            
            members = []
            for line in output.splitlines():
                line = line.strip()
                if line and not line.startswith('Name'):
                    parts = line.split()
                    if parts:
                        members.append({
                            "name": parts[0],
                            "created": parts[1] if len(parts) > 1 else "",
                            "modified": parts[2] if len(parts) > 2 else ""
                        })
            
            return jsonify({
                "members": members,
                "mock": False
            })
            
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"Error listing members:\n{error_trace}")
            return jsonify({"error": str(e)}), 500

    @app.route("/api/datasets/content", methods=["GET"])
    def get_content():
        try:
            from flask import request
            dataset = request.args.get('dataset', '').strip()
            member = request.args.get('member', '').strip()
            
            if not dataset:
                return jsonify({"error": "Dataset parameter is required"}), 400
            
            mock_mode = current_app.config.get('MOCK_MODE', True)
            
            if mock_mode:
                return jsonify({
                    "content": f"""//TESTJOB JOB (ACCT),'TEST JOB',CLASS=A,MSGCLASS=H
//STEP1   EXEC PGM=IEFBR14
//DD1     DD DSN={dataset},DISP=SHR
//*
//* This is a test job
//*""",
                    "mock": True
                })
            
            if member:
                cmd = f'zowe files view data-set "{dataset}({member})"'
            else:
                cmd = f'zowe files view data-set "{dataset}"'
            
            content = run_zowe(cmd)
            
            return jsonify({
                "content": content,
                "mock": False
            })
            
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"Error getting content:\n{error_trace}")
            return jsonify({"error": str(e)}), 500