async function loadDashboardData() {
    try {
        const response = await fetch('/api/dashboard');
        
        if (!response.ok) {
            throw new Error('Failed to load dashboard data');
        }
        
        const data = await response.json();
        
        document.getElementById('datasets-count').textContent = data.datasets || 0;
        document.getElementById('jobs-count').textContent = data.jobs_today || 0;
        document.getElementById('uss-count').textContent = data.uss_files || 0;
        document.getElementById('scripts-count').textContent = data.scripts || 0;
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        
        document.getElementById('datasets-count').innerHTML = '<i class="bi bi-exclamation-triangle text-danger"></i>';
        document.getElementById('jobs-count').innerHTML = '<i class="bi bi-exclamation-triangle text-danger"></i>';
        document.getElementById('uss-count').innerHTML = '<i class="bi bi-exclamation-triangle text-danger"></i>';
        document.getElementById('scripts-count').innerHTML = '<i class="bi bi-exclamation-triangle text-danger"></i>';
    }
}

async function loadRecentActivities() {
    try {
        const response = await fetch('/api/activities?limit=5');
        
        if (!response.ok) {
            throw new Error('Failed to load activities');
        }
        
        const data = await response.json();
        const container = document.getElementById('activity-container');
        
        if (data.activities && data.activities.length > 0) {
            container.innerHTML = data.activities.map(activity => {
                return `
                    <div class="activity-item">
                        <div class="activity-icon ${activity.type}">
                            <i class="bi bi-${activity.icon}"></i>
                        </div>
                        <div class="activity-content">
                            <div class="activity-title">${escapeHtml(activity.title)}</div>
                            <div class="activity-meta">
                                ${escapeHtml(activity.meta)} • ${escapeHtml(activity.relative_time)}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            container.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="bi bi-inbox fs-1"></i>
                    <p class="mt-2">No recent activities</p>
                    <small>Start working to see your activity here</small>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('Error loading activities:', error);
        const container = document.getElementById('activity-container');
        container.innerHTML = `
            <div class="text-center text-danger py-4">
                <i class="bi bi-exclamation-triangle"></i>
                <p class="mt-2">Failed to load activities</p>
            </div>
        `;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function syncMainframeJobs() {
    const btn = document.getElementById('sync-btn');
    
    if (!btn) {
        console.error('Sync button not found!');
        return;
    }
    
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Syncing...';
    
    try {
        const response = await fetch('/api/activities/sync', {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log(`✅ Synced ${data.synced} new activities`);
            
            await loadRecentActivities();
            
            btn.innerHTML = '<i class="bi bi-check"></i> Synced!';
            setTimeout(() => {
                btn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Sync';
                btn.disabled = false;
            }, 2000);
        } else {
            throw new Error(data.error || 'Sync failed');
        }
    } catch (error) {
        console.error('Sync error:', error);
        btn.innerHTML = '<i class="bi bi-x"></i> Failed';
        setTimeout(() => {
            btn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Sync';
            btn.disabled = false;
        }, 2000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Dashboard loaded');
    
    loadDashboardData();
    loadRecentActivities();
    
    syncMainframeJobs();
});

setInterval(loadDashboardData, 30000);
setInterval(loadRecentActivities, 30000);
setInterval(syncMainframeJobs, 60000);

// System Status Functions
async function loadSystemStatus() {
    console.log('🔄 Loading system status...');
    
    try {
        const response = await fetch('/api/system-status');
        const data = await response.json();
        
        console.log('📊 System status data:', data);
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to load system status');
        }
        
        // Update CPU Usage
        const cpuElement = document.getElementById('cpu-usage');
        if (cpuElement) {
            cpuElement.textContent = data.cpu_usage + '%';
            cpuElement.style.color = `var(--${getCpuColor(data.cpu_usage)})`;
        }
        
        // Update Uptime
        const uptimeElement = document.getElementById('uptime-value');
        if (uptimeElement) {
            uptimeElement.textContent = data.uptime;
        }
        
        // Update Disk Space
        const diskElement = document.getElementById('disk-space');
        if (diskElement) {
            diskElement.textContent = data.disk_free_percent + '%';
            diskElement.style.color = `var(--${getDiskColor(data.disk_free_percent)})`;
        }
        
        // Update Active Users
        const usersElement = document.getElementById('active-users-value');
        if (usersElement) {
            usersElement.textContent = data.active_users;
        }
        
        console.log('✅ System status loaded successfully');
        
    } catch (error) {
        console.error('❌ Error loading system status:', error);
        
        // Show error in UI
        ['cpu-usage', 'uptime-value', 'disk-space', 'active-users-value'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = 'Error';
                element.style.color = 'var(--danger)';
            }
        });
    }
}

function getCpuColor(usage) {
    if (usage < 50) return 'success';
    if (usage < 75) return 'warning';
    return 'danger';
}

function getDiskColor(freePercent) {
    if (freePercent > 50) return 'success';
    if (freePercent > 25) return 'warning';
    return 'danger';
}

// Make function globally available for onclick
window.loadSystemStatus = loadSystemStatus;

// Check if we're on the dashboard page and auto-load
if (window.location.pathname === '/' || window.location.pathname === '/index') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('📄 Dashboard loaded, initializing system status...');
            loadSystemStatus();
            
            // Refresh every 30 seconds
            setInterval(loadSystemStatus, 30000);
        });
    } else {
        console.log('📄 Dashboard already loaded, initializing system status...');
        loadSystemStatus();
        
        // Refresh every 30 seconds
        setInterval(loadSystemStatus, 30000);
    }
}