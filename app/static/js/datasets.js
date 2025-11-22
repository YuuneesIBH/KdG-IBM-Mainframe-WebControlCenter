let currentHlq = 'ZUSER';
let datasets = [];

function showDatasetState(state) {
    document.getElementById('loadingState').style.display = state === 'loading' ? 'block' : 'none';
    document.getElementById('emptyState').style.display = state === 'empty' ? 'block' : 'none';
    document.getElementById('errorState').style.display = state === 'error' ? 'block' : 'none';
    document.getElementById('datasetList').style.display = state === 'data' ? 'block' : 'none';
}

async function loadDatasets() {
    const hlq = document.getElementById('hlqInput').value.trim() || 'ZUSER';
    currentHlq = hlq;
    
    showDatasetState('loading');
    document.getElementById('datasetHeader').textContent = `Datasets (${hlq})`;

    try {
        const response = await fetch(`/api/datasets?hlq=${encodeURIComponent(hlq)}`);
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        datasets = data.datasets || [];
        
        if (datasets.length === 0) {
            showDatasetState('empty');
            updateStats();
            return;
        }

        renderDatasets();
        updateStats();
        showDatasetState('data');
    } catch (error) {
        document.getElementById('errorMessage').textContent = error.message;
        showDatasetState('error');
    }
}

function renderDatasets() {
    const container = document.getElementById('datasetList');
    container.innerHTML = datasets.map((ds, idx) => {
        const iconClass = ds.type === 'PDS' ? 'bi-folder-fill' : 'bi-file-earmark-fill';
        const colorStyle = ds.type === 'PDS' ? 'var(--primary)' : 'var(--info)';
        
        return `
            <a href="#" class="action-link" onclick="selectDataset('${ds.name}', '${ds.type}'); return false;">
                <i class="bi ${iconClass}" style="color: ${colorStyle};"></i>
                <div class="flex-grow-1">
                    <div class="fw-bold">${ds.name}</div>
                    <small class="text-muted">${ds.type}</small>
                </div>
                ${ds.type === 'PDS' ? '<i class="bi bi-chevron-right"></i>' : ''}
            </a>
        `;
    }).join('');
}

function updateStats() {
    const pdsCount = datasets.filter(d => d.type === 'PDS').length;
    const seqCount = datasets.filter(d => d.type === 'SEQ').length;
    
    document.getElementById('totalDatasets').textContent = datasets.length;
    document.getElementById('totalPds').textContent = pdsCount;
    document.getElementById('totalSeq').textContent = seqCount;
}

async function selectDataset(name, type) {
    if (type === 'PDS') {
        await loadMembers(name);
    } else {
        window.location.href = `/editor?dataset=${encodeURIComponent(name)}`;
    }
}

async function loadMembers(dsn) {
    const membersList = document.getElementById('membersList');
    const membersTitle = document.getElementById('membersTitle');
    
    document.getElementById('membersEmptyState').style.display = 'none';
    membersTitle.textContent = `Members of ${dsn}`;
    
    membersList.style.display = 'block';
    membersList.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary mb-3" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="text-muted">Loading members...</p>
        </div>
    `;

    try {
        const response = await fetch(`/api/datasets/${encodeURIComponent(dsn)}/members`);
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        const members = data.members || [];
        
        if (members.length === 0) {
            membersList.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-file-code" style="font-size: 3rem; opacity: 0.3;"></i>
                    <p class="text-muted mt-3">No members found</p>
                </div>
            `;
            return;
        }

        membersList.innerHTML = members.map((member, idx) => `
            <a href="#" class="action-link" onclick="openMember('${dsn}', '${member.name}'); return false;">
                <i class="bi bi-file-code" style="color: var(--secondary);"></i>
                <div class="flex-grow-1">
                    <div class="fw-bold">${member.name}</div>
                    ${member.ext ? `<small class="text-muted">${member.ext}</small>` : ''}
                </div>
                <i class="bi bi-chevron-right"></i>
            </a>
        `).join('');

    } catch (error) {
        membersList.innerHTML = `
            <div class="text-center py-5">
                <i class="bi bi-exclamation-triangle" style="font-size: 3rem; color: var(--danger); opacity: 0.5;"></i>
                <p class="text-muted mt-3">${error.message}</p>
            </div>
        `;
    }
}

function openMember(dsn, member) {
    window.location.href = `/editor?dataset=${encodeURIComponent(dsn)}&member=${encodeURIComponent(member)}`;
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('searchBtn').addEventListener('click', loadDatasets);
    document.getElementById('hlqInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loadDatasets();
    });
    loadDatasets();
});