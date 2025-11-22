let currentOwner = '*';
let currentPrefix = '*';
let jobs = [];
let selectedJobId = null;

function showJobsState(state) {
    document.getElementById('loadingState').style.display = state === 'loading' ? 'block' : 'none';
    document.getElementById('emptyState').style.display = state === 'empty' ? 'block' : 'none';
    document.getElementById('errorState').style.display = state === 'error' ? 'block' : 'none';
    document.getElementById('jobsList').style.display = state === 'data' ? 'block' : 'none';
}

async function loadJobs() {
    const owner = document.getElementById('ownerInput').value.trim() || '*';
    const prefix = document.getElementById('prefixInput').value.trim() || '*';
    const status = document.getElementById('statusFilter').value;
    
    currentOwner = owner;
    currentPrefix = prefix;
    
    showJobsState('loading');
    
    try {
        let url = `/api/jobs?owner=${encodeURIComponent(owner)}&prefix=${encodeURIComponent(prefix)}`;
        if (status !== 'ALL') {
            url += `&status=${encodeURIComponent(status)}`;
        }
        
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        jobs = data.jobs || [];
        
        if (jobs.length === 0) {
            showJobsState('empty');
            updateStats();
            return;
        }

        renderJobs();
        updateStats();
        showJobsState('data');
    } catch (error) {
        document.getElementById('errorMessage').textContent = error.message;
        showJobsState('error');
    }
}

function renderJobs() {
    const container = document.getElementById('jobsList');
    container.innerHTML = jobs.map(job => {
        const statusClass = getStatusClass(job.status);
        
        return `
            <div class="job-item" onclick="selectJob('${job.jobid}')">
                <div class="job-header">
                    <div>
                        <div class="job-name">${job.jobname}</div>
                        <div class="job-id">${job.jobid}</div>
                    </div>
                    <span class="job-status ${statusClass}">${job.status}</span>
                </div>
                <div class="job-info">
                    <div class="job-info-item">
                        <i class="bi bi-person-circle"></i>
                        <span>Owner: <strong>${job.owner}</strong></span>
                    </div>
                    <div class="job-info-item">
                        <i class="bi bi-list-ol"></i>
                        <span>Class: <strong>${job.class || 'A'}</strong></span>
                    </div>
                    ${job.retcode ? `
                    <div class="job-info-item">
                        <i class="bi bi-flag"></i>
                        <span>RC: <strong>${job.retcode}</strong></span>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function getStatusClass(status) {
    const statusMap = {
        'ACTIVE': 'active',
        'INPUT': 'active',
        'OUTPUT': 'output',
        'ABEND': 'abend',
        'CC': 'cc'
    };
    return statusMap[status] || 'output';
}

function updateStats() {
    const activeCount = jobs.filter(j => j.status === 'ACTIVE' || j.status === 'INPUT').length;
    const outputCount = jobs.filter(j => j.status === 'OUTPUT').length;
    const errorCount = jobs.filter(j => j.status === 'ABEND').length;
    
    document.getElementById('totalJobs').textContent = jobs.length;
    document.getElementById('activeJobs').textContent = activeCount;
    document.getElementById('completedJobs').textContent = outputCount;
}

async function selectJob(jobid) {
    selectedJobId = jobid;
    const job = jobs.find(j => j.jobid === jobid);
    
    if (!job) return;
    
    const detailsContainer = document.getElementById('jobDetails');
    const emptyState = document.getElementById('detailsEmptyState');
    
    emptyState.style.display = 'none';
    detailsContainer.style.display = 'block';
    
    detailsContainer.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary mb-3" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="text-muted">Loading job details...</p>
        </div>
    `;
    
    try {
        const response = await fetch(`/api/jobs/${encodeURIComponent(jobid)}`);
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        renderJobDetails(data);
    } catch (error) {
        detailsContainer.innerHTML = `
            <div class="text-center py-5">
                <i class="bi bi-exclamation-triangle" style="font-size: 3rem; color: var(--danger); opacity: 0.5;"></i>
                <p class="text-muted mt-3">${error.message}</p>
            </div>
        `;
    }
}

function renderJobDetails(jobData) {
    const container = document.getElementById('jobDetails');
    const statusClass = getStatusClass(jobData.status);
    
    let stepsHtml = '';
    if (jobData.steps && jobData.steps.length > 0) {
        stepsHtml = jobData.steps.map(step => {
            const rcClass = step.retcode === 'CC 0000' ? 'success' : 'error';
            return `
                <div class="job-step">
                    <div class="step-header">
                        <span class="step-name">${step.stepname}</span>
                        <span class="step-rc ${rcClass}">${step.retcode || 'N/A'}</span>
                    </div>
                    <div class="step-info">
                        ${step.program ? `Program: ${step.program}` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    let spoolHtml = '';
    if (jobData.spool && jobData.spool.length > 0) {
        spoolHtml = `
            <div class="spool-files">
                <h6 class="mb-3">Spool Files</h6>
                ${jobData.spool.map(spool => `
                    <div class="spool-file" onclick="viewSpool('${jobData.jobid}', '${spool.id}')">
                        <div class="spool-info">
                            <i class="bi bi-file-text spool-icon"></i>
                            <div>
                                <div class="spool-name">${spool.ddname}</div>
                                <div class="spool-meta">${spool.stepname} - ${spool.procstep || ''}</div>
                            </div>
                        </div>
                        <i class="bi bi-chevron-right" style="color: var(--text-muted);"></i>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    container.innerHTML = `
        <div class="job-details">
            <div class="job-details-header">
                <div>
                    <div class="job-details-title">${jobData.jobname} (${jobData.jobid})</div>
                    <span class="job-status ${statusClass} mt-2" style="display: inline-block;">${jobData.status}</span>
                </div>
                <div class="job-actions">
                    <button class="btn-secondary-custom" onclick="purgeJob('${jobData.jobid}')">
                        <i class="bi bi-trash"></i>
                        Purge
                    </button>
                    <button class="btn-primary-custom" onclick="refreshJobDetails('${jobData.jobid}')">
                        <i class="bi bi-arrow-clockwise"></i>
                        Refresh
                    </button>
                </div>
            </div>
            
            <div class="mb-4">
                <h6 class="mb-3">Job Information</h6>
                <div class="job-info">
                    <div class="job-info-item">
                        <i class="bi bi-person-circle"></i>
                        <span>Owner: <strong>${jobData.owner}</strong></span>
                    </div>
                    <div class="job-info-item">
                        <i class="bi bi-list-ol"></i>
                        <span>Class: <strong>${jobData.class || 'A'}</strong></span>
                    </div>
                    ${jobData.retcode ? `
                    <div class="job-info-item">
                        <i class="bi bi-flag"></i>
                        <span>Return Code: <strong>${jobData.retcode}</strong></span>
                    </div>
                    ` : ''}
                    ${jobData.subsystem ? `
                    <div class="job-info-item">
                        <i class="bi bi-server"></i>
                        <span>Subsystem: <strong>${jobData.subsystem}</strong></span>
                    </div>
                    ` : ''}
                </div>
            </div>
            
            ${stepsHtml ? `
            <div class="mb-4">
                <h6 class="mb-3">Job Steps</h6>
                ${stepsHtml}
            </div>
            ` : ''}
            
            ${spoolHtml}
        </div>
    `;
}

async function refreshJobDetails(jobid) {
    await selectJob(jobid);
}

async function purgeJob(jobid) {
    if (!confirm(`Are you sure you want to purge job ${jobid}?`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/jobs/${encodeURIComponent(jobid)}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        alert(`Job ${jobid} purged successfully`);
        
        // Reload jobs list
        await loadJobs();
        
        // Clear details panel
        document.getElementById('detailsEmptyState').style.display = 'block';
        document.getElementById('jobDetails').style.display = 'none';
        
    } catch (error) {
        alert(`Error purging job: ${error.message}`);
    }
}

function viewSpool(jobid, spoolId) {
    window.location.href = `/spool?jobid=${encodeURIComponent(jobid)}&id=${encodeURIComponent(spoolId)}`;
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('searchBtn').addEventListener('click', loadJobs);
    
    document.getElementById('ownerInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loadJobs();
    });
    
    document.getElementById('prefixInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loadJobs();
    });
    
    document.getElementById('statusFilter').addEventListener('change', loadJobs);
    
    setInterval(() => {
        if (selectedJobId) {
            refreshJobDetails(selectedJobId);
        }
    }, 30000);
    
    loadJobs();
});