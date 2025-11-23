let currentDataset = '';
let currentMember = '';
let originalContent = '';
let isModified = false;
let autoSaveInterval = null;

function initEditor() {
    const urlParams = new URLSearchParams(window.location.search);
    currentDataset = urlParams.get('dataset');
    currentMember = urlParams.get('member');
    
    if (currentDataset) {
        document.getElementById('datasetName').textContent = currentDataset;
        loadMembers();
        
        if (currentMember) {
            loadMember(currentMember);
        }
    }
    
    const editor = document.getElementById('codeEditor');
    editor.addEventListener('input', handleEditorChange);
    
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    const autoSave = localStorage.getItem('editorAutoSave') === 'true';
    if (autoSave) {
        enableAutoSave();
    }
}

function handleEditorChange() {
    const currentContent = document.getElementById('codeEditor').value;
    isModified = currentContent !== originalContent;
    updateSaveStatus();
    updateLineNumbers();
}

function updateSaveStatus() {
    const statusElement = document.getElementById('saveStatus');
    const saveBtn = document.getElementById('saveBtn');
    
    if (isModified) {
        statusElement.innerHTML = '<i class="bi bi-circle-fill modified"></i> Modified';
        saveBtn.disabled = false;
    } else {
        statusElement.innerHTML = '<i class="bi bi-check-circle-fill saved"></i> Saved';
        saveBtn.disabled = true;
    }
}

async function loadMembers() {
    try {
        const response = await fetch(`/api/datasets/members?dataset=${encodeURIComponent(currentDataset)}`);
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        renderMembersList(data.members || []);
    } catch (error) {
        console.error('Error loading members:', error);
        document.getElementById('membersList').innerHTML = `
            <div class="text-center py-4">
                <i class="bi bi-exclamation-triangle text-danger"></i>
                <p class="text-muted mt-2">Error loading members</p>
            </div>
        `;
    }
}

function renderMembersList(members) {
    const container = document.getElementById('membersList');
    
    if (members.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4">
                <i class="bi bi-file-code" style="font-size: 2rem; color: var(--text-muted); opacity: 0.3;"></i>
                <p class="text-muted mt-2">No members found</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = members.map(member => `
        <div class="member-item ${member.name === currentMember ? 'active' : ''}" 
             onclick="loadMember('${member.name}')">
            <div class="member-item-info">
                <i class="bi bi-file-code member-icon"></i>
                <div>
                    <div class="member-name">${member.name}</div>
                    ${member.modified ? `<div class="member-meta">${member.modified}</div>` : ''}
                </div>
            </div>
            <div class="member-actions" onclick="event.stopPropagation()">
                <button class="member-action-btn" onclick="deleteMember('${member.name}')" title="Delete">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

async function loadMember(memberName) {
    if (isModified) {
        const confirm = window.confirm('You have unsaved changes. Do you want to discard them?');
        if (!confirm) return;
    }
    
    currentMember = memberName;
    document.getElementById('memberName').textContent = memberName;
    
    const url = new URL(window.location);
    url.searchParams.set('member', memberName);
    window.history.pushState({}, '', url);
    
    const editor = document.getElementById('codeEditor');
    editor.value = 'Loading...';
    editor.disabled = true;
    
    try {
        const response = await fetch(`/api/datasets/content?dataset=${encodeURIComponent(currentDataset)}&member=${encodeURIComponent(memberName)}`);
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        originalContent = data.content || '';
        editor.value = originalContent;
        editor.disabled = false;
        isModified = false;
        updateSaveStatus();
        updateLineNumbers();
        
        loadMembers();
        
        detectSyntax();
        
    } catch (error) {
        editor.value = '';
        editor.disabled = false;
        alert(`Error loading member: ${error.message}`);
    }
}

async function saveMember() {
    if (!currentMember) {
        alert('No member selected');
        return;
    }
    
    const content = document.getElementById('codeEditor').value;
    const saveIndicator = document.getElementById('saveIndicator');
    
    saveIndicator.className = 'save-indicator saving';
    saveIndicator.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Saving...';
    
    try {
        const response = await fetch(`/api/datasets/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                dataset: currentDataset,
                member: currentMember,
                content: content 
            })
        });
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        originalContent = content;
        isModified = false;
        updateSaveStatus();
        
        saveIndicator.className = 'save-indicator saved';
        saveIndicator.innerHTML = '<i class="bi bi-check-circle-fill"></i> Saved';
        
        setTimeout(() => {
            saveIndicator.innerHTML = '';
        }, 2000);
        
    } catch (error) {
        saveIndicator.className = 'save-indicator error';
        saveIndicator.innerHTML = '<i class="bi bi-exclamation-circle-fill"></i> Error';
        alert(`Error saving member: ${error.message}`);
        
        setTimeout(() => {
            saveIndicator.innerHTML = '';
        }, 3000);
    }
}

async function deleteMember(memberName) {
    if (!confirm(`Are you sure you want to delete member ${memberName}?`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/datasets/delete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                dataset: currentDataset,
                member: memberName
            })
        });
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        alert('Member deleted successfully');
        
        if (memberName === currentMember) {
            currentMember = '';
            document.getElementById('codeEditor').value = '';
            document.getElementById('memberName').textContent = 'No member selected';
            
            const url = new URL(window.location);
            url.searchParams.delete('member');
            window.history.pushState({}, '', url);
        }
        
        loadMembers();
        
    } catch (error) {
        alert(`Error deleting member: ${error.message}`);
    }
}

function showNewMemberModal() {
    const modal = document.getElementById('newMemberModal');
    document.getElementById('newMemberName').value = '';
    modal.classList.add('show');
}

async function createNewMember() {
    const memberName = document.getElementById('newMemberName').value.trim().toUpperCase();
    
    if (!memberName) {
        alert('Please enter a member name');
        return;
    }
    
    if (!/^[A-Z0-9@#$]{1,8}$/.test(memberName)) {
        alert('Invalid member name. Must be 1-8 characters (A-Z, 0-9, @, #, $)');
        return;
    }
    
    try {
        const response = await fetch(`/api/datasets/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                dataset: currentDataset,
                member: memberName,
                content: '' 
            })
        });
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        alert('Member created successfully');
        closeModal('newMemberModal');
        loadMembers();
        loadMember(memberName);
        
    } catch (error) {
        alert(`Error creating member: ${error.message}`);
    }
}

function detectSyntax() {
    const editor = document.getElementById('codeEditor');
    const content = editor.value.toUpperCase();
    
    if (content.includes('//') && content.includes('JOB')) {
        editor.className = 'syntax-jcl';
    } else if (content.includes('IDENTIFICATION DIVISION') || content.includes('PROCEDURE DIVISION')) {
        editor.className = 'syntax-cobol';
    } else if (content.includes('/* REXX */') || content.includes('SAY ') || content.includes('PARSE ')) {
        editor.className = 'syntax-rexx';
    } else {
        editor.className = '';
    }
}

function updateLineNumbers() {
    const editor = document.getElementById('codeEditor');
    const lineCount = editor.value.split('\n').length;
    const lineNumbersContainer = document.getElementById('lineNumbers');
    
    if (lineNumbersContainer && editor.classList.contains('editor-with-numbers')) {
        let numbers = '';
        for (let i = 1; i <= lineCount; i++) {
            numbers += `<span>${i}</span>`;
        }
        lineNumbersContainer.innerHTML = numbers;
    }
}

function toggleLineNumbers() {
    const btn = document.getElementById('lineNumbersBtn');
    const editor = document.getElementById('codeEditor');
    const showLineNumbers = !editor.classList.contains('editor-with-numbers');
    
    if (showLineNumbers) {
        editor.classList.add('editor-with-numbers');
        btn.classList.add('active');
        updateLineNumbers();
    } else {
        editor.classList.remove('editor-with-numbers');
        btn.classList.remove('active');
    }
}

function toggleWordWrap() {
    const btn = document.getElementById('wordWrapBtn');
    const editor = document.getElementById('codeEditor');
    const isWrapped = editor.style.whiteSpace === 'pre-wrap';
    
    if (isWrapped) {
        editor.style.whiteSpace = 'pre';
        btn.classList.remove('active');
    } else {
        editor.style.whiteSpace = 'pre-wrap';
        btn.classList.add('active');
    }
}

function changeFontSize(size) {
    const editor = document.getElementById('codeEditor');
    editor.style.fontSize = size + 'px';
    localStorage.setItem('editorFontSize', size);
}

function toggleAutoSave() {
    const toggle = document.getElementById('autoSaveToggle');
    const isEnabled = toggle.classList.contains('active');
    
    if (isEnabled) {
        toggle.classList.remove('active');
        disableAutoSave();
        localStorage.setItem('editorAutoSave', 'false');
    } else {
        toggle.classList.add('active');
        enableAutoSave();
        localStorage.setItem('editorAutoSave', 'true');
    }
}

function enableAutoSave() {
    autoSaveInterval = setInterval(() => {
        if (isModified && currentMember) {
            saveMember();
        }
    }, 30000);
}

function disableAutoSave() {
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
        autoSaveInterval = null;
    }
}

function handleKeyboardShortcuts(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (isModified) {
            saveMember();
        }
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        showNewMemberModal();
    }
}

function searchMembers() {
    const searchTerm = document.getElementById('memberSearch').value.toLowerCase();
    const members = document.querySelectorAll('.member-item');
    
    members.forEach(member => {
        const memberName = member.querySelector('.member-name').textContent.toLowerCase();
        if (memberName.includes(searchTerm)) {
            member.style.display = 'flex';
        } else {
            member.style.display = 'none';
        }
    });
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

document.addEventListener('DOMContentLoaded', function() {
    initEditor();
    
    const savedFontSize = localStorage.getItem('editorFontSize');
    if (savedFontSize) {
        document.getElementById('codeEditor').style.fontSize = savedFontSize + 'px';
        document.getElementById('fontSizeSelect').value = savedFontSize;
    }
    
    const autoSave = localStorage.getItem('editorAutoSave') === 'true';
    if (autoSave) {
        document.getElementById('autoSaveToggle').classList.add('active');
    }
    
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
            }
        });
    });
    
    window.addEventListener('beforeunload', (e) => {
        if (isModified) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
});