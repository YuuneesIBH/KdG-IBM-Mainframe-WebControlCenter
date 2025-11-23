import json
import os
from datetime import datetime, timedelta
from activity_logger import ActivityLogger
from routes import run_zowe

SYNC_STATE_FILE = "sync_state.json"

class ActivitySync:
    
    @staticmethod
    def sync_mainframe_jobs(mock_mode=False):
        if mock_mode:
            return {"success": True, "synced": 0, "mock": True}
        
        try:
            synced_jobs = ActivitySync._load_sync_state()
            
            cmd = 'zowe jobs list jobs --owner * --rfj'
            output = run_zowe(cmd)
            
            data = json.loads(output)
            jobs_list = data.get('data', [])
            
            synced_count = 0
            new_synced_jobs = {}
            
            for job in jobs_list:
                jobid = job.get('jobid', '')
                jobname = job.get('jobname', '')
                owner = job.get('owner', '')
                status = job.get('status', '')
                retcode = job.get('retcode', '')
                
                if jobid in synced_jobs:
                    new_synced_jobs[jobid] = True 
                    continue
                
                if status == 'OUTPUT':
                    # Bepaal of job succesvol was
                    if retcode and 'CC 0000' in retcode:
                        ActivityLogger.log_activity(
                            activity_type="success",
                            title=f"Job {jobname} completed by {owner}",
                            meta=f"Job ID: {jobid} • {retcode}",
                            icon="check-circle-fill"
                        )
                    else:
                        ActivityLogger.log_activity(
                            activity_type="danger",
                            title=f"Job {jobname} failed by {owner}",
                            meta=f"Job ID: {jobid} • {retcode or 'Unknown RC'}",
                            icon="x-circle-fill"
                        )
                    
                    synced_count += 1
                    new_synced_jobs[jobid] = True
            
            ActivitySync._save_sync_state(new_synced_jobs)
            
            print(f"✅ Synced {synced_count} new job activities from mainframe")
            
            return {
                "success": True,
                "synced": synced_count,
                "total_jobs": len(jobs_list),
                "mock": False
            }
            
        except Exception as e:
            import traceback
            print(f"❌ Error syncing mainframe jobs:\n{traceback.format_exc()}")
            return {"success": False, "error": str(e)}
    
    @staticmethod
    def _load_sync_state():
        if not os.path.exists(SYNC_STATE_FILE):
            return {}
        
        try:
            with open(SYNC_STATE_FILE, 'r') as f:
                data = json.load(f)
                return data.get('synced_jobs', {})
        except (json.JSONDecodeError, FileNotFoundError):
            return {}
    
    @staticmethod
    def _save_sync_state(synced_jobs):
        if len(synced_jobs) > 1000:
            jobs_list = list(synced_jobs.keys())[-1000:]
            synced_jobs = {job: True for job in jobs_list}
        
        try:
            with open(SYNC_STATE_FILE, 'w') as f:
                json.dump({
                    'synced_jobs': synced_jobs,
                    'last_sync': datetime.now().isoformat()
                }, f, indent=2)
        except Exception as e:
            print(f"Error saving sync state: {e}")
    
    @staticmethod
    def clear_sync_state():
        if os.path.exists(SYNC_STATE_FILE):
            os.remove(SYNC_STATE_FILE)
            print("🗑️  Sync state cleared")