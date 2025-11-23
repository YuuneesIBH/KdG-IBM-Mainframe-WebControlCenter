let currentDatasets = [];
let currentDataset = null;

document.addEventListener('DOMContentLoaded', function() {
    const hlqInput = document.getElementById('hlqInput');
    loadDatasets(hlqInput.value);
    
    document.getElementById('searchBtn').addEventListener('click', function() {
        const hlq = hlqInput.value.trim();
        if (hlq) {
            loadDatasets(hlq);
        }
    });
    
    hlqInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const hlq = hlqInput.value.trim();
            if (hlq) {
                loadDatasets(hlq);
            }
        }
    });
    
    document.getElementById('scrollToDatasets').addEventListener('click', function(e) {
        e.preventDefault();
        document.querySelector('#datasetList').scrollIntoView({ behavior: 'smooth' });
    });
});

async function loadDatasets(hlq) {
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const errorState = document.getElementById('errorState');
    const datasetList = document.getElementById('datasetList');
    const datasetHeader = document.getElementById('datasetHeader');
    
    loadingState.style.display = 'block';
    emptyState.style.display = 'none';
    errorState.style.display = 'none';
    datasetList.innerHTML = '';
    
    clearMembers();
    
    try {
        const response = await fetch(`/api/datasets/list?hlq=${encodeURIComponent(hlq)}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        currentDatasets = data.datasets || [];
        
        loadingState.style.display = 'none';
        
        datasetHeader.textContent = `Datasets (${currentDatasets.length})`;
        
        if (currentDatasets.length === 0) {
            emptyState.style.display = 'block';
        } else {
            updateStats(currentDatasets);
            renderDatasets(currentDatasets);
        }
        
    } catch (error) {
        console.error('Error loading datasets:', error);
        
        loadingState.style.display = 'none';
        errorState.style.display = 'block';
        document.getElementById('errorMessage').textContent = error.message;
    }
}

function updateStats(datasets) {
    const totalDatasets = datasets.length;
    const pdsCount = datasets.filter(ds => ds.type === 'PDS').length;
    const seqCount = datasets.filter(ds => ds.type === 'PS').length;
    
    document.getElementById('totalDatasets').textContent = totalDatasets;
    document.getElementById('totalPds').textContent = pdsCount;
    document.getElementById('totalSeq').textContent = seqCount;
}

function renderDatasets(datasets) {
    const datasetList = document.getElementById('datasetList');
    
    datasetList.innerHTML = datasets.map(ds => `
        <div class="dataset-item ${ds.type === 'PDS' ? 'dataset-pds' : 'dataset-ps'}" 
             onclick="handleDatasetClick('${ds.name}', '${ds.type}')">
            <div class="dataset-icon">
                <i class="bi ${ds.type === 'PDS' ? 'bi-folder2-open' : 'bi-file-earmark'}"></i>
            </div>
            <div class="dataset-info">
                <div class="dataset-name">${ds.name}</div>
                <div class="dataset-meta">
                    <span class="badge ${ds.type === 'PDS' ? 'badge-primary' : 'badge-info'}">
                        ${ds.type}
                    </span>
                    ${ds.type === 'PDS' && ds.members > 0 ? `
                        <span class="text-muted ms-2">
                            <i class="bi bi-files"></i> ${ds.members} members
                        </span>
                    ` : ''}
                </div>
            </div>
            ${ds.type === 'PDS' ? `
                <div class="dataset-actions">
                    <i class="bi bi-chevron-right"></i>
                </div>
            ` : `
                <div class="dataset-actions">
                    <i class="bi bi-pencil-square"></i>
                </div>
            `}
        </div>
    `).join('');
}

async function handleDatasetClick(datasetName, type) {
    currentDataset = datasetName;
    
    if (type === 'PDS') {
        await loadMembers(datasetName);
    } else {
        openInEditor(datasetName, null);
    }
}

async function loadMembers(dataset) {
    const membersTitle = document.getElementById('membersTitle');
    const membersList = document.getElementById('membersList');
    const emptyState = document.getElementById('membersEmptyState');
    
    emptyState.style.display = 'none';
    membersList.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary mb-3" role="status"></div>
            <p class="text-muted">Loading members...</p>
        </div>
    `;
    
    try {
        const response = await fetch(`/api/datasets/members?dataset=${encodeURIComponent(dataset)}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        const members = data.members || [];
        
        membersTitle.innerHTML = `
            <i class="bi bi-file-code" style="color: var(--secondary);"></i>
            ${dataset} (${members.length} members)
        `;
        
        if (members.length === 0) {
            membersList.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-inbox" style="font-size: 3rem; opacity: 0.3;"></i>
                    <p class="text-muted mt-3">No members found</p>
                </div>
            `;
        } else {
            membersList.innerHTML = members.map(member => `
                <div class="member-item" onclick="openInEditor('${dataset}', '${member.name}')">
                    <div class="member-icon">
                        <i class="bi bi-file-code"></i>
                    </div>
                    <div class="member-info">
                        <div class="member-name">${member.name}</div>
                        <div class="member-meta">
                            ${member.modified ? `<small class="text-muted">Modified: ${member.modified}</small>` : ''}
                        </div>
                    </div>
                    <div class="member-actions">
                        <i class="bi bi-pencil-square"></i>
                    </div>
                </div>
            `).join('');
        }
        
    } catch (error) {
        console.error('Error loading members:', error);
        membersList.innerHTML = `
            <div class="text-center py-5">
                <i class="bi bi-exclamation-triangle text-danger" style="font-size: 3rem; opacity: 0.5;"></i>
                <h5 class="mt-3">Error Loading Members</h5>
                <p class="text-muted">${error.message}</p>
            </div>
        `;
    }
}

function openInEditor(dataset, member) {
    if (member) {
        window.location.href = `/editor?dataset=${encodeURIComponent(dataset)}&member=${encodeURIComponent(member)}`;
    } else {
        window.location.href = `/editor?dataset=${encodeURIComponent(dataset)}`;
    }
}

function clearMembers() {
    document.getElementById('membersTitle').innerHTML = `
        <i class="bi bi-file-code" style="color: var(--secondary);"></i>
        Members
    `;
    document.getElementById('membersList').innerHTML = '';
    document.getElementById('membersEmptyState').style.display = 'block';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}