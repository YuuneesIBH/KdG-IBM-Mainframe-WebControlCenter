from flask import Blueprint, render_template, jsonify, current_app, request
import subprocess
import os
import json
import re
from activity_logger import (
    ActivityLogger, 
    log_job_completed, 
    log_job_failed,
    log_file_edited, 
    log_script_executed, 
    log_uss_upload,
    log_dataset_created
)

api = Blueprint("api", __name__)

def run_zowe(cmd):
    print(f"Executing: {cmd}")
    
    if isinstance(cmd, str):
        import shlex
        cmd_list = shlex.split(cmd)
    else:
        cmd_list = cmd
    
    result = subprocess.run(
        cmd_list,
        shell=False,  # Important: avoid shell globbing
        stdout=subprocess.PIPE, 
        stderr=subprocess.PIPE, 
        text=True
    )
    
    print(f"Return code: {result.returncode}")
    print(f"stdout: {result.stdout[:200]}")
    
    if result.returncode != 0:
        print(f"stderr: {result.stderr}")
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
        
    @app.route("/api/activities", methods=["GET"])
    def get_activities():
        try:
            limit = request.args.get('limit', 10, type=int)
            activities = ActivityLogger.get_recent_activities(limit)
            
            return jsonify({
                "activities": activities,
                "success": True
            })
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"Error getting activities:\n{error_trace}")
            return jsonify({
                "error": str(e),
                "activities": []
            }), 500

    @app.route("/api/dashboard", methods=["GET"])
    def dashboard_data():
        try:
            mock_mode = current_app.config.get('MOCK_MODE', True)
            
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
            
            user = os.environ.get("ZOS_USER")
            profile = os.environ.get("ZOWE_PROFILE", user)
            
            if not user:
                raise Exception("ZOS_USER environment variable not set")

            print(f"Fetching data for user: {user}, profile: {profile}")

            try:
                ds_cmd = f'zowe files list data-set "{user}.*"'
                ds_output = run_zowe(ds_cmd)
                lines = [line for line in ds_output.splitlines() if line.strip() and not line.startswith('Data Set')]
                dataset_count = len(lines)
            except Exception as e:
                print(f"Error getting datasets: {e}")
                dataset_count = 0

            try:
                jobs_cmd = f'zowe jobs list jobs --owner * --rfj'
                print(f"Getting ALL jobs with command: {jobs_cmd}")
                jobs_output = run_zowe(jobs_cmd)
                
                try:
                    data = json.loads(jobs_output)
                    jobs_list = data.get('data', [])
                    jobs_today = len(jobs_list)
                    print(f"✅ Found {jobs_today} total jobs")
                except json.JSONDecodeError:
                    lines = [line for line in jobs_output.splitlines() if line.strip() and not line.startswith('JOBID')]
                    jobs_today = len(lines)
                    print(f"✅ Found {jobs_today} total jobs (table format)")
            except Exception as e:
                print(f"Error getting jobs: {e}")
                jobs_today = 0

            uss_count = 0
            script_count = 0
            
            try:
                uss_cmd = 'zowe files list uss-files "/u"'
                uss_output = run_zowe(uss_cmd)
                lines = [line.strip() for line in uss_output.splitlines() if line.strip() and line.strip() not in ['.', '..']]
                uss_count = len(lines)
                print(f"✅ Found {uss_count} items in /u directory")
                
                script_count = sum(1 for line in lines if any(ext in line.lower() for ext in ['.rexx', '.sh', '.py', '.jcl']))
            except Exception as e:
                print(f"Error browsing /u directory: {e}")
                
                possible_paths = [
                    f'/u/{user.lower()}',
                    f'/u/{user}',
                ]
                
                for path in possible_paths:
                    try:
                        uss_cmd = f'zowe files list uss-files "{path}"'
                        uss_output = run_zowe(uss_cmd)
                        lines = [line.strip() for line in uss_output.splitlines() if line.strip() and line.strip() not in ['.', '..']]
                        uss_count = len(lines)
                        print(f"✅ Found USS directory: {path} with {uss_count} items")
                        
                        script_count = sum(1 for line in lines if any(ext in line.lower() for ext in ['.rexx', '.sh', '.py', '.jcl']))
                        break
                    except Exception as e:
                        print(f"USS path {path} not found, trying next...")
                        continue

            return jsonify({
                "datasets": dataset_count,
                "jobs_today": jobs_today,
                "uss_files": uss_count,
                "scripts": script_count,
                "mock": False
            })

        except Exception as e:
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
            
    @app.route("/api/system-status", methods=["GET"])
    def get_system_status():
        try:
            mock_mode = current_app.config.get('MOCK_MODE', True)
            
            print("=" * 50)
            print(f"🔍 System status called - MOCK_MODE: {mock_mode}")
            print("=" * 50)
            
            if mock_mode:
                return jsonify({
                    "cpu_usage": 34,
                    "active_jobs": 12,
                    "disk_free_percent": 67,
                    "tso_users": 8,
                    "jobs_today": 156,
                    "success_rate": 94.3,
                    "failed_jobs": 9,
                    "mock": True
                })
            
            user = os.environ.get("ZOS_USER")
            
            active_jobs = 0
            jobs_today = 0
            failed_jobs = 0
            success_rate = 100.0
            
            try:
                jobs_cmd = 'zowe jobs list jobs --owner * --rfj'
                jobs_output = run_zowe(jobs_cmd)
                data = json.loads(jobs_output)
                jobs_list = data.get('data', [])
                
                active_jobs = len([j for j in jobs_list if j.get('status') in ['ACTIVE', 'INPUT']])
                
                jobs_today = len(jobs_list)
                
                failed_jobs = len([j for j in jobs_list if j.get('retcode') and 
                                j.get('retcode') != 'CC 0000' and 
                                j.get('status') == 'OUTPUT'])
                
                completed_jobs = len([j for j in jobs_list if j.get('status') == 'OUTPUT'])
                if completed_jobs > 0:
                    successful_jobs = completed_jobs - failed_jobs
                    success_rate = round((successful_jobs / completed_jobs) * 100, 1)
                
            except Exception as e:
                print(f"Error getting job statistics: {e}")
            
            disk_free_percent = 67
            try:
                df_cmd = 'zowe zos-uss issue ssh "df -k /"'
                df_output = run_zowe(df_cmd)
                lines = df_output.strip().split('\n')
                if len(lines) > 1:
                    parts = lines[1].split()
                    if len(parts) >= 5:
                        use_percent = int(parts[4].rstrip('%'))
                        disk_free_percent = 100 - use_percent
            except Exception as e:
                print(f"Error getting disk space: {e}")
            
            tso_users = 1
            try:
                who_cmd = 'zowe zos-uss issue ssh "who | wc -l"'
                who_output = run_zowe(who_cmd)
                tso_users = int(who_output.strip())
            except Exception as e:
                print(f"Error getting TSO users: {e}")
            
            cpu_usage = min(20 + (active_jobs * 8), 95)
            
            return jsonify({
                "cpu_usage": cpu_usage,
                "active_jobs": active_jobs,
                "disk_free_percent": disk_free_percent,
                "tso_users": tso_users,
                "jobs_today": jobs_today,
                "success_rate": success_rate,
                "failed_jobs": failed_jobs,
                "mock": False
            })
            
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"Error getting system status:\n{error_trace}")
            return jsonify({
                "error": str(e),
                "cpu_usage": 0,
                "active_jobs": 0,
                "disk_free_percent": 0,
                "tso_users": 0,
                "jobs_today": 0,
                "success_rate": 0,
                "failed_jobs": 0
            }), 500
    
    @app.route("/api/jobs", methods=["GET"])
    def list_jobs():
        try:
            owner = request.args.get('owner', '*').strip()
            prefix = request.args.get('prefix', '*').strip()
            status = request.args.get('status', '').strip()
            
            mock_mode = current_app.config.get('MOCK_MODE', True)
            
            if mock_mode:
                mock_jobs = [
                    {
                        "jobid": "JOB00123",
                        "jobname": "TESTJOB1",
                        "owner": "ZUSER",
                        "status": "OUTPUT",
                        "retcode": "CC 0000",
                        "class": "A"
                    },
                    {
                        "jobid": "JOB00124",
                        "jobname": "TESTJOB2",
                        "owner": "ZUSER",
                        "status": "ACTIVE",
                        "retcode": None,
                        "class": "A"
                    },
                    {
                        "jobid": "JOB00125",
                        "jobname": "COMPILE",
                        "owner": "ZUSER",
                        "status": "OUTPUT",
                        "retcode": "CC 0004",
                        "class": "A"
                    }
                ]
                
                if status and status != 'ALL':
                    mock_jobs = [j for j in mock_jobs if j['status'] == status]
                
                return jsonify({
                    "jobs": mock_jobs,
                    "mock": True
                })
            
            user = os.environ.get("ZOS_USER")
            
            cmd = f'zowe jobs list jobs --owner {owner} --rfj'
            if prefix != '*':
                cmd += f' --prefix {prefix}'
            
            print(f"Listing jobs with command: {cmd}")
            output = run_zowe(cmd)
            
            try:
                data = json.loads(output)
                jobs_list = data.get('data', [])
            except json.JSONDecodeError:
                # Fallback: parse table format
                jobs_list = []
                for line in output.splitlines():
                    if line.strip() and not line.startswith('JOBID'):
                        parts = line.split()
                        if len(parts) >= 4:
                            jobs_list.append({
                                "jobid": parts[0],
                                "jobname": parts[1],
                                "owner": parts[2],
                                "status": parts[3],
                                "retcode": parts[4] if len(parts) > 4 else None,
                                "class": parts[5] if len(parts) > 5 else "A"
                            })
            
            if status and status != 'ALL':
                jobs_list = [j for j in jobs_list if j.get('status') == status]
            
            return jsonify({
                "jobs": jobs_list,
                "mock": False
            })
            
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"Error listing jobs:\n{error_trace}")
            return jsonify({
                "error": str(e),
                "jobs": []
            }), 500

    @app.route("/api/jobs/<jobid>", methods=["GET"])
    def get_job_details(jobid):
        try:
            mock_mode = current_app.config.get('MOCK_MODE', True)
            
            if mock_mode:
                return jsonify({
                    "jobid": jobid,
                    "jobname": "TESTJOB1",
                    "owner": "ZUSER",
                    "status": "OUTPUT",
                    "retcode": "CC 0000",
                    "class": "A",
                    "subsystem": "JES2",
                    "steps": [
                        {
                            "stepname": "STEP1",
                            "procstep": None,
                            "program": "IEFBR14",
                            "retcode": "CC 0000"
                        },
                        {
                            "stepname": "STEP2",
                            "procstep": None,
                            "program": "IEBGENER",
                            "retcode": "CC 0000"
                        }
                    ],
                    "spool": [
                        {
                            "id": "2",
                            "ddname": "JESMSGLG",
                            "stepname": "JES2",
                            "procstep": None
                        },
                        {
                            "id": "3",
                            "ddname": "JESJCL",
                            "stepname": "JES2",
                            "procstep": None
                        },
                        {
                            "id": "4",
                            "ddname": "JESYSMSG",
                            "stepname": "JES2",
                            "procstep": None
                        }
                    ],
                    "mock": True
                })
            
            cmd = f'zowe jobs view job-status-by-jobid {jobid} --rfj'
            print(f"Getting job details: {cmd}")
            output = run_zowe(cmd)
            
            job_data = json.loads(output)
            
            spool_cmd = f'zowe jobs list spool-files-by-jobid {jobid} --rfj'
            spool_output = run_zowe(spool_cmd)
            spool_data = json.loads(spool_output)
            
            return jsonify({
                "jobid": job_data.get('data', {}).get('jobid', jobid),
                "jobname": job_data.get('data', {}).get('jobname', ''),
                "owner": job_data.get('data', {}).get('owner', ''),
                "status": job_data.get('data', {}).get('status', ''),
                "retcode": job_data.get('data', {}).get('retcode'),
                "class": job_data.get('data', {}).get('class', 'A'),
                "subsystem": job_data.get('data', {}).get('subsystem'),
                "steps": [],  # Would need additional parsing
                "spool": spool_data.get('data', []),
                "mock": False
            })
            
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"Error getting job details:\n{error_trace}")
            return jsonify({"error": str(e)}), 500

    @app.route("/api/jobs/<jobid>", methods=["DELETE"])
    def purge_job(jobid):
        try:
            mock_mode = current_app.config.get('MOCK_MODE', True)
            
            if mock_mode:
                print(f"MOCK: Purging job {jobid}")
                
                # NIEUW: Log de activity
                ActivityLogger.log_activity(
                    activity_type="danger",
                    title=f"Purged job {jobid}",
                    meta="Job removed from system",
                    icon="trash-fill"
                )
                
                return jsonify({
                    "success": True,
                    "message": f"Job {jobid} purged successfully (MOCK)",
                    "mock": True
                })
            
            cmd = f'zowe jobs delete job {jobid}'
            print(f"Purging job: {cmd}")
            output = run_zowe(cmd)
            
            ActivityLogger.log_activity(
                activity_type="danger",
                title=f"Purged job {jobid}",
                meta="Job removed from system",
                icon="trash-fill"
            )
            
            return jsonify({
                "success": True,
                "message": f"Job {jobid} purged successfully",
                "mock": False
            })
            
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"Error purging job:\n{error_trace}")
            return jsonify({
                "success": False,
                "error": str(e)
            }), 500

    @app.route("/api/jobs/<jobid>/spool/<int:spool_id>", methods=["GET"])
    def get_spool_content(jobid, spool_id):
        try:
            mock_mode = current_app.config.get('MOCK_MODE', True)
            
            if mock_mode:
                return jsonify({
                    "content": f"Mock spool content for {jobid} - spool {spool_id}\n\nThis is sample output from a JES2 job.\n",
                    "mock": True
                })
            
            cmd = f'zowe jobs view spool-file-by-id {jobid} {spool_id}'
            print(f"Getting spool content: {cmd}")
            content = run_zowe(cmd)
            
            return jsonify({
                "content": content,
                "mock": False
            })
            
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"Error getting spool content:\n{error_trace}")
            return jsonify({"error": str(e)}), 500

    @app.route("/api/datasets/list", methods=["GET"])
    def list_datasets():
        try:
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
                    parts = line.split()
                    if parts:
                        ds_name = parts[0]
                        ds_type = "PDS" if any(x in ds_name.upper() for x in ['JCL', 'SOURCE', 'LOAD', 'LIB']) else "PS"
                        datasets.append({
                            "name": ds_name,
                            "type": ds_type,
                            "members": 0
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

    @app.route("/api/datasets/save", methods=["POST"])
    def save_content():
        try:
            data = request.get_json()
            dataset = data.get('dataset', '').strip()
            member = data.get('member', '').strip()
            content = data.get('content', '')
            
            if not dataset:
                return jsonify({"error": "Dataset parameter is required"}), 400
            
            mock_mode = current_app.config.get('MOCK_MODE', True)
            
            if mock_mode:
                print(f"MOCK: Saving {dataset}({member})")
                return jsonify({
                    "success": True,
                    "message": "Content saved successfully (MOCK)",
                    "mock": True
                })
            
            import tempfile
            with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt') as tmp:
                tmp.write(content)
                tmp_path = tmp.name
            
            try:
                if member:
                    cmd = f'zowe files upload file-to-data-set "{tmp_path}" "{dataset}({member})"'
                else:
                    cmd = f'zowe files upload file-to-data-set "{tmp_path}" "{dataset}"'
                
                output = run_zowe(cmd)
                
                return jsonify({
                    "success": True,
                    "message": "Content saved successfully",
                    "mock": False
                })
            finally:
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)
            
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"Error saving content:\n{error_trace}")
            return jsonify({
                "success": False,
                "error": str(e)
            }), 500

    @app.route("/api/uss/browse", methods=["GET"])
    def browse_uss():
        try:
            path = request.args.get('path', '/').strip()
            
            if not path:
                return jsonify({"error": "Path parameter is required"}), 400
            
            mock_mode = current_app.config.get('MOCK_MODE', True)
            
            if mock_mode:
                mock_files = [
                    {
                        "name": "scripts",
                        "type": "directory",
                        "permissions": "drwxr-xr-x",
                        "size": 4096,
                        "modified": "2024-11-20"
                    },
                    {
                        "name": "data",
                        "type": "directory",
                        "permissions": "drwxr-xr-x",
                        "size": 4096,
                        "modified": "2024-11-19"
                    },
                    {
                        "name": "test.sh",
                        "type": "file",
                        "permissions": "-rwxr-xr-x",
                        "size": 1024,
                        "modified": "2024-11-22"
                    },
                    {
                        "name": "config.txt",
                        "type": "file",
                        "permissions": "-rw-r--r--",
                        "size": 512,
                        "modified": "2024-11-21"
                    },
                    {
                        "name": "backup.tar.gz",
                        "type": "file",
                        "permissions": "-rw-r--r--",
                        "size": 204800,
                        "modified": "2024-11-18"
                    },
                    {
                        "name": "README.md",
                        "type": "file",
                        "permissions": "-rw-r--r--",
                        "size": 2048,
                        "modified": "2024-11-15"
                    }
                ]
                
                return jsonify({
                    "path": path,
                    "files": mock_files,
                    "mock": True
                })
            
            cmd = f'zowe files list uss-files "{path}"'
            print(f"Browsing USS: {cmd}")
            output = run_zowe(cmd)
            
            files = []
            lines = [l.strip() for l in output.splitlines() if l.strip()]
            
            for line in lines:
                if line in ['.', '..']:
                    continue
                
                is_directory = line.endswith('/')
                name = line.rstrip('/')
                
                if not name:
                    continue
                
                files.append({
                    "name": name,
                    "type": "directory" if is_directory else "file",
                    "permissions": "drwxr-xr-x" if is_directory else "-rw-r--r--",
                    "size": 4096 if is_directory else 0,
                    "modified": "Unknown"
                })
            
            return jsonify({
                "path": path,
                "files": files,
                "mock": False
            })
            
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"Error browsing USS:\n{error_trace}")
            return jsonify({"error": str(e)}), 500

    @app.route("/api/uss/file", methods=["GET"])
    def get_uss_file():
        try:
            path = request.args.get('path', '').strip()
            
            if not path:
                return jsonify({"error": "Path parameter is required"}), 400
            
            mock_mode = current_app.config.get('MOCK_MODE', True)
            
            if mock_mode:
                return jsonify({
                    "content": f"""#!/bin/bash
    # Mock USS file content
    # File: {path}

    echo "Hello from USS"
    echo "This is a test script"

    # Example commands
    ls -la
    pwd
    """,
                    "mock": True
                })
            
            cmd = f'zowe files view uss-file "{path}"'
            print(f"Reading USS file: {cmd}")
            content = run_zowe(cmd)
            
            return jsonify({
                "content": content,
                "mock": False
            })
            
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"Error reading USS file:\n{error_trace}")
            return jsonify({"error": str(e)}), 500

    @app.route("/api/uss/file", methods=["PUT"])
    def save_uss_file():
        """Save or create USS file"""
        try:
            data = request.get_json()
            path = data.get('path', '').strip()
            content = data.get('content', '')
            
            if not path:
                return jsonify({"error": "Path parameter is required"}), 400
            
            mock_mode = current_app.config.get('MOCK_MODE', True)
            
            if mock_mode:
                print(f"MOCK: Saving USS file {path}")
                return jsonify({
                    "success": True,
                    "message": f"File {path} saved successfully (MOCK)",
                    "mock": True
                })
            
            # Real mainframe operation
            import tempfile
            with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt', encoding='utf-8') as tmp:
                tmp.write(content)
                tmp_path = tmp.name
            
            try:
                cmd = f'zowe files upload file-to-uss "{tmp_path}" "{path}"'
                print(f"Saving USS file: {cmd}")
                output = run_zowe(cmd)
                
                return jsonify({
                    "success": True,
                    "message": f"File {path} saved successfully",
                    "mock": False
                })
            finally:
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)
            
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"Error saving USS file:\n{error_trace}")
            return jsonify({
                "success": False,
                "error": str(e)
            }), 500

    @app.route("/api/uss/file", methods=["DELETE"])
    def delete_uss_file():
        try:
            path = request.args.get('path', '').strip()
            
            if not path:
                return jsonify({"error": "Path parameter is required"}), 400
            
            mock_mode = current_app.config.get('MOCK_MODE', True)
            
            if mock_mode:
                print(f"MOCK: Deleting USS file/directory {path}")
                return jsonify({
                    "success": True,
                    "message": f"Item {path} deleted successfully (MOCK)",
                    "mock": True
                })
        
            cmd = f'zowe files delete uss "{path}" --for-sure --recursive'
            print(f"Deleting USS item: {cmd}")
            
            try:
                output = run_zowe(cmd)
            except Exception as e:
                cmd = f'zowe files delete uss "{path}" --for-sure'
                output = run_zowe(cmd)
            
            return jsonify({
                "success": True,
                "message": f"Item {path} deleted successfully",
                "mock": False
            })
            
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"Error deleting USS item:\n{error_trace}")
            return jsonify({
                "success": False,
                "error": str(e)
            }), 500

    @app.route("/api/uss/directory", methods=["POST"])
    def create_uss_directory():
        try:
            data = request.get_json()
            path = data.get('path', '').strip()
            
            if not path:
                return jsonify({"error": "Path parameter is required"}), 400
            
            mock_mode = current_app.config.get('MOCK_MODE', True)
            
            if mock_mode:
                print(f"MOCK: Creating USS directory {path}")
                return jsonify({
                    "success": True,
                    "message": f"Directory {path} created successfully (MOCK)",
                    "mock": True
                })
            
            cmd = f'zowe files create uss-directory "{path}"'
            print(f"Creating USS directory: {cmd}")
            output = run_zowe(cmd)
            
            return jsonify({
                "success": True,
                "message": f"Directory {path} created successfully",
                "mock": False
            })
            
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"Error creating USS directory:\n{error_trace}")
            return jsonify({
                "success": False,
                "error": str(e)
            }), 500

    @app.route("/api/uss/download", methods=["GET"])
    def download_uss_file():
        try:
            path = request.args.get('path', '').strip()
            
            if not path:
                return jsonify({"error": "Path parameter is required"}), 400
            
            mock_mode = current_app.config.get('MOCK_MODE', True)
            
            if mock_mode:
                from flask import Response
                content = f"Mock content for {path}\nThis would be the actual file content."
                filename = path.split('/')[-1]
                return Response(
                    content,
                    mimetype='text/plain',
                    headers={
                        'Content-Disposition': f'attachment; filename={filename}'
                    }
                )
            
            import tempfile
            import shutil
            
            tmp_dir = tempfile.mkdtemp()
            filename = path.split('/')[-1]
            local_path = os.path.join(tmp_dir, filename)
            
            try:
                cmd = f'zowe files download uss-file "{path}" --file "{local_path}"'
                print(f"Downloading USS file: {cmd}")
                run_zowe(cmd)
                
                from flask import send_file
                
                def cleanup():
                    try:
                        shutil.rmtree(tmp_dir, ignore_errors=True)
                    except:
                        pass
                
                import atexit
                atexit.register(cleanup)
                
                return send_file(
                    local_path,
                    as_attachment=True,
                    download_name=filename
                )
            except Exception as e:
                shutil.rmtree(tmp_dir, ignore_errors=True)
                raise e
            
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"Error downloading USS file:\n{error_trace}")
            return jsonify({"error": str(e)}), 500
        
        
    @app.route("/api/activities/sync", methods=["POST"])
    def sync_mainframe_activities():
        from activity_sync import ActivitySync
        
        mock_mode = current_app.config.get('MOCK_MODE', True)
        result = ActivitySync.sync_mainframe_jobs(mock_mode)
        
        if result.get('success'):
            return jsonify(result)
        else:
            return jsonify(result), 500
        
    @app.route("/api/zbot", methods=["POST"])
    def zbot_chat():
        try:
            data = request.get_json()
            user_message = data.get('message', '').strip()
            code = data.get('code', '').strip()

            from text_ai import ask_zbot
            result = ask_zbot(user_message, code)

            return jsonify(result)

        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"Error in Z-Bot chat:\n{error_trace}")
            return jsonify({
                "success": False,
                "response": "Sorry, I encountered an error. Please try again.",
                "error": str(e)
            }), 500
