let currentDataset = '';
let currentMember = '';
let originalContent = '';
let hasChanges = false;
let autoSaveEnabled = true;
let autoSaveInterval = null;
let allMembers = [];

document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    currentDataset = urlParams.get('dataset');
    currentMember = urlParams.get('member');
    
    if (currentDataset) {
        document.getElementById('datasetName').textContent = currentDataset;
        loadMembers();
        
        if (currentMember) {
            document.getElementById('memberName').textContent = currentMember;
            loadMemberContent(currentMember);
        }
    } else {
        document.getElementById('datasetName').textContent = 'No dataset selected';
        document.getElementById('codeEditor').disabled = false;
        document.getElementById('codeEditor').placeholder = 'Enter your code here...';
    }
    
    const editor = document.getElementById('codeEditor');
    editor.addEventListener('input', handleEditorChange);
    editor.addEventListener('scroll', function() {
        document.getElementById('lineNumbers').scrollTop = this.scrollTop;
    });
    
    updateLineNumbers();
    
    document.getElementById('autoSaveToggle').classList.add('active');
    startAutoSave();
    
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            saveMember();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            showNewMemberModal();
        }
    });
});

function loadMembers() {
    const membersList = document.getElementById('membersList');
    membersList.innerHTML = '<div class="text-center py-3"><div class="spinner-border spinner-border-sm text-primary"></div></div>';
    
    fetch(`/api/datasets/members?dataset=${encodeURIComponent(currentDataset)}`)
        .then(response => response.json())
        .then(data => {
            allMembers = data.members || [];
            displayMembers(allMembers);
        })
        .catch(error => {
            console.error('Error loading members:', error);
            membersList.innerHTML = '<div class="text-center py-3 text-danger">Error loading members</div>';
        });
}

function displayMembers(members) {
    const membersList = document.getElementById('membersList');
    
    if (members.length === 0) {
        membersList.innerHTML = '<div class="text-center py-3 text-muted">No members found</div>';
        return;
    }
    
    membersList.innerHTML = members.map(member => `
        <div class="member-item ${member.name === currentMember ? 'active' : ''}" 
             onclick="selectMember('${member.name}')">
            <i class="bi bi-file-code"></i>
            <div class="member-details">
                <div class="member-name">${member.name}</div>
                ${member.modified ? `<div class="member-date">Modified: ${member.modified}</div>` : ''}
            </div>
        </div>
    `).join('');
}

function searchMembers() {
    const searchTerm = document.getElementById('memberSearch').value.toUpperCase();
    const filtered = allMembers.filter(m => m.name.includes(searchTerm));
    displayMembers(filtered);
}

function selectMember(memberName) {
    if (hasChanges) {
        if (!confirm('You have unsaved changes. Do you want to discard them?')) {
            return;
        }
    }
    
    currentMember = memberName;
    document.getElementById('memberName').textContent = memberName;
    
    const newUrl = `${window.location.pathname}?dataset=${encodeURIComponent(currentDataset)}&member=${encodeURIComponent(memberName)}`;
    window.history.pushState({}, '', newUrl);
    
    document.querySelectorAll('.member-item').forEach(item => {
        item.classList.remove('active');
    });
    event.currentTarget.classList.add('active');
    
    loadMemberContent(memberName);
}

function loadMemberContent(memberName) {
    const editor = document.getElementById('codeEditor');
    editor.value = 'Loading...';
    editor.disabled = true;
    
    fetch(`/api/datasets/content?dataset=${encodeURIComponent(currentDataset)}&member=${encodeURIComponent(memberName)}`)
        .then(response => response.json())
        .then(data => {
            originalContent = data.content || '';
            editor.value = originalContent;
            editor.disabled = false;
            hasChanges = false;
            updateSaveButton();
            updateLineNumbers();
            setSaveStatus('saved');
        })
        .catch(error => {
            console.error('Error loading content:', error);
            editor.value = '// Error loading content';
            editor.disabled = false;
        });
}

function handleEditorChange() {
    const currentContent = document.getElementById('codeEditor').value;
    hasChanges = (currentContent !== originalContent);
    updateSaveButton();
    updateLineNumbers();
    
    if (hasChanges) {
        setSaveStatus('unsaved');
    }
}

function updateSaveButton() {
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
        saveBtn.disabled = !hasChanges || !currentMember || !currentDataset;
    }
}

function setSaveStatus(status) {
    const statusEl = document.getElementById('saveStatus');
    
    if (status === 'saved') {
        statusEl.innerHTML = '<i class="bi bi-check-circle-fill saved"></i> Saved';
    } else if (status === 'unsaved') {
        statusEl.innerHTML = '<i class="bi bi-exclamation-circle-fill unsaved"></i> Unsaved changes';
    } else if (status === 'saving') {
        statusEl.innerHTML = '<i class="bi bi-arrow-repeat saving"></i> Saving...';
    } else if (status === 'error') {
        statusEl.innerHTML = '<i class="bi bi-x-circle-fill error"></i> Save failed';
    }
}

async function saveMember() {
    if (!currentMember || !hasChanges || !currentDataset) {
        if (!currentDataset) {
            showNotification('No dataset selected. Cannot save.', 'error');
        }
        return;
    }
    
    const content = document.getElementById('codeEditor').value;
    setSaveStatus('saving');
    
    try {
        const response = await fetch('/api/datasets/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                dataset: currentDataset,
                member: currentMember,
                content: content
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            originalContent = content;
            hasChanges = false;
            updateSaveButton();
            setSaveStatus('saved');
            showNotification('File saved successfully', 'success');
        } else {
            setSaveStatus('error');
            showNotification('Failed to save file: ' + (data.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Error saving member:', error);
        setSaveStatus('error');
        showNotification('Failed to save file: ' + error.message, 'error');
    }
}

function toggleAutoSave() {
    autoSaveEnabled = !autoSaveEnabled;
    const toggle = document.getElementById('autoSaveToggle');
    
    if (autoSaveEnabled) {
        toggle.classList.add('active');
        startAutoSave();
        showNotification('Auto-save enabled', 'success');
    } else {
        toggle.classList.remove('active');
        stopAutoSave();
        showNotification('Auto-save disabled', 'info');
    }
}

function startAutoSave() {
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
    }
    
    autoSaveInterval = setInterval(() => {
        if (autoSaveEnabled && hasChanges && currentMember && currentDataset) {
            console.log('Auto-saving...');
            saveMember();
        }
    }, 30000);
}

function stopAutoSave() {
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
        autoSaveInterval = null;
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="bi bi-${type === 'success' ? 'check-circle-fill' : type === 'error' ? 'x-circle-fill' : 'info-circle-fill'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function updateLineNumbers() {
    const editor = document.getElementById('codeEditor');
    const lineNumbers = document.getElementById('lineNumbers');
    const lines = editor.value.split('\n').length;
    
    lineNumbers.innerHTML = Array.from({length: lines}, (_, i) => 
        `<div class="line-number">${i + 1}</div>`
    ).join('');
    
    lineNumbers.scrollTop = editor.scrollTop;
}

function toggleLineNumbers() {
    const lineNumbers = document.getElementById('lineNumbers');
    const btn = document.getElementById('lineNumbersBtn');
    lineNumbers.style.display = lineNumbers.style.display === 'none' ? 'block' : 'none';
    btn.classList.toggle('active');
}

function toggleWordWrap() {
    const editor = document.getElementById('codeEditor');
    const btn = document.getElementById('wordWrapBtn');
    editor.style.whiteSpace = editor.style.whiteSpace === 'pre' ? 'pre-wrap' : 'pre';
    btn.classList.toggle('active');
}

function changeFontSize(size) {
    const editor = document.getElementById('codeEditor');
    editor.style.fontSize = size + 'px';
}

function showNewMemberModal() {
    if (!currentDataset) {
        showNotification('Please select a dataset first from the Datasets page', 'error');
        return;
    }
    document.getElementById('newMemberModal').style.display = 'flex';
    document.getElementById('newMemberName').focus();
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function createNewMember() {
    const memberName = document.getElementById('newMemberName').value.toUpperCase().trim();
    
    if (!memberName) {
        showNotification('Please enter a member name', 'error');
        return;
    }
    
    if (!/^[A-Z0-9@#$]{1,8}$/.test(memberName)) {
        showNotification('Invalid member name. Use 1-8 characters (A-Z, 0-9, @, #, $)', 'error');
        return;
    }
    
    if (allMembers.find(m => m.name === memberName)) {
        showNotification('Member already exists', 'error');
        return;
    }
    
    closeModal('newMemberModal');
    
    currentMember = memberName;
    document.getElementById('memberName').textContent = memberName;
    document.getElementById('codeEditor').value = '';
    originalContent = '';
    hasChanges = true;
    updateSaveButton();
    
    allMembers.push({name: memberName, created: new Date().toISOString().split('T')[0], modified: ''});
    displayMembers(allMembers);
    
    saveMember();
    
    showNotification('New member created', 'success');
}