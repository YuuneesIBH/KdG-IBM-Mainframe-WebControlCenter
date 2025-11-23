import json
import os
from datetime import datetime
from typing import List, Dict

ACTIVITY_FILE = "activities.json"
MAX_ACTIVITIES = 50  

class ActivityLogger:
    @staticmethod
    def log_activity(activity_type: str, title: str, meta: str = "", icon: str = "info"):
        """
        Log an activity to the file
        
        Args:
            activity_type: Type of activity (success, primary, warning, info, danger)
            title: Main activity description
            meta: Additional metadata (e.g., "Return Code: 0000 • 5 minutes ago")
            icon: Bootstrap icon name (default: "info")
        """
        activities = ActivityLogger._load_activities()
        
        activity = {
            "type": activity_type,
            "title": title,
            "meta": meta,
            "icon": icon,
            "timestamp": datetime.now().isoformat()
        }
        
        activities.insert(0, activity)
        
        activities = activities[:MAX_ACTIVITIES]
        
        # Save
        ActivityLogger._save_activities(activities)
    
    @staticmethod
    def get_recent_activities(limit: int = 10) -> List[Dict]:
        activities = ActivityLogger._load_activities()
        
        # Add relative time to each activity
        for activity in activities:
            activity['relative_time'] = ActivityLogger._get_relative_time(
                activity['timestamp']
            )
        
        return activities[:limit]
    
    @staticmethod
    def _load_activities() -> List[Dict]:
        if not os.path.exists(ACTIVITY_FILE):
            return []
        
        try:
            with open(ACTIVITY_FILE, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return []
    
    @staticmethod
    def _save_activities(activities: List[Dict]):
        with open(ACTIVITY_FILE, 'w') as f:
            json.dump(activities, f, indent=2)
    
    @staticmethod
    def _get_relative_time(timestamp_str: str) -> str:
        try:
            timestamp = datetime.fromisoformat(timestamp_str)
            now = datetime.now()
            diff = now - timestamp
            
            seconds = diff.total_seconds()
            
            if seconds < 60:
                return "just now"
            elif seconds < 3600:
                minutes = int(seconds / 60)
                return f"{minutes} minute{'s' if minutes > 1 else ''} ago"
            elif seconds < 86400:
                hours = int(seconds / 3600)
                return f"{hours} hour{'s' if hours > 1 else ''} ago"
            else:
                days = int(seconds / 86400)
                return f"{days} day{'s' if days > 1 else ''} ago"
        except:
            return "unknown"

def log_job_completed(jobname: str, retcode: str):
    ActivityLogger.log_activity(
        activity_type="success",
        title=f"Job {jobname} completed successfully",
        meta=f"Return Code: {retcode}",
        icon="check-circle-fill"
    )

def log_job_failed(jobname: str, retcode: str):
    ActivityLogger.log_activity(
        activity_type="danger",
        title=f"Job {jobname} failed",
        meta=f"Return Code: {retcode}",
        icon="x-circle-fill"
    )

def log_file_edited(dataset: str, member: str = None, lines: int = 0):
    if member:
        title = f"Edited {dataset}({member})"
    else:
        title = f"Edited {dataset}"
    
    meta = f"Modified {lines} line{'s' if lines != 1 else ''}" if lines > 0 else "File modified"
    
    ActivityLogger.log_activity(
        activity_type="primary",
        title=title,
        meta=meta,
        icon="pencil-fill"
    )

def log_script_executed(script_name: str, success: bool = True):
    if success:
        ActivityLogger.log_activity(
            activity_type="warning",
            title=f"Executed {script_name} script",
            meta="Script ran successfully",
            icon="play-fill"
        )
    else:
        ActivityLogger.log_activity(
            activity_type="danger",
            title=f"Script {script_name} failed",
            meta="Script execution failed",
            icon="exclamation-triangle-fill"
        )

def log_uss_upload(filename: str, path: str):
    ActivityLogger.log_activity(
        activity_type="info",
        title=f"Uploaded file to USS",
        meta=f"{filename} → {path}",
        icon="upload"
    )

def log_dataset_created(dataset: str):
    ActivityLogger.log_activity(
        activity_type="success",
        title=f"Created dataset {dataset}",
        meta="Dataset allocated successfully",
        icon="folder-plus"
    )