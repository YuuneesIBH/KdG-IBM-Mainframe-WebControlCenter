let currentPath = '/u/' + 'zuser'; // of haal dit op van een API endpoint
let files = [];

function showUssState(state) {
    document.getElementById('loadingState').style.display = state === 'loading' ? 'block' : 'none';
    document.getElementById('emptyState').style.display = state === 'empty' ? 'block' : 'none';
    document.getElementById('errorState').style.display = state === 'error' ? 'block' : 'none';
    document.getElementById('fileBrowser').style.display = state === 'data' ? 'block' : 'none';
}

async function loadDirectory(path = null) {
    if (path !== null) {
        currentPath = path;
    }
    
    showUssState('loading');
    updateBreadcrumb();

    try {
        const response = await fetch(`/api/uss/browse?path=${encodeURIComponent(currentPath)}`);
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        files = data.files || [];
        
        if (files.length === 0) {
            showUssState('empty');
            updateStats();
            return;
        }

        renderFiles();
        updateStats();
        showUssState('data');
    } catch (error) {
        document.getElementById('errorMessage').textContent = error.message;
        showUssState('error');
    }
}

function renderFiles() {
    const container = document.getElementById('fileBrowser');
    
    const sortedFiles = files.sort((a, b) => {
        if (a.type === 'directory' && b.type !== 'directory') return -1;
        if (a.type !== 'directory' && b.type === 'directory') return 1;
        return a.name.localeCompare(b.name);
    });
    
    container.innerHTML = sortedFiles.map(file => {
        const icon = getFileIcon(file);
        const permissions = file.permissions || '---------';
        const size = formatFileSize(file.size || 0);
        const modified = file.modified || 'Unknown';
        
        return `
            <div class="uss-item" onclick="handleFileClick('${escapeHtml(file.name)}', '${file.type}')">
                <div class="uss-icon ${file.type}">
                    <i class="bi ${icon}"></i>
                </div>
                <div class="uss-info">
                    <div class="uss-name">${escapeHtml(file.name)}</div>
                    <div class="uss-meta">
                        <span class="uss-meta-item">
                            <i class="bi bi-shield-lock"></i>
                            <span class="permission-badge">${permissions}</span>
                        </span>
                        ${file.type !== 'directory' ? `
                        <span class="uss-meta-item">
                            <i class="bi bi-hdd"></i>
                            ${size}
                        </span>
                        ` : ''}
                        <span class="uss-meta-item">
                            <i class="bi bi-clock"></i>
                            ${modified}
                        </span>
                    </div>
                </div>
                <div class="uss-actions" onclick="event.stopPropagation()">
                    ${file.type !== 'directory' ? `
                    <button class="uss-action-btn" onclick="viewFile('${escapeHtml(file.name)}')" title="View">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="uss-action-btn" onclick="editFile('${escapeHtml(file.name)}')" title="Edit">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="uss-action-btn" onclick="downloadFile('${escapeHtml(file.name)}')" title="Download">
                        <i class="bi bi-download"></i>
                    </button>
                    ` : ''}
                    <button class="uss-action-btn" onclick="deleteFile('${escapeHtml(file.name)}', '${file.type}')" title="Delete">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function getFileIcon(file) {
    if (file.type === 'directory') return 'bi-folder-fill';
    
    const ext = file.name.split('.').pop().toLowerCase();
    const executableExts = ['sh', 'bash', 'ksh'];
    const scriptExts = ['py', 'rexx', 'rex', 'exec'];
    
    if (file.permissions && file.permissions.includes('x')) {
        return 'bi-terminal-fill';
    }
    if (executableExts.includes(ext) || scriptExts.includes(ext)) {
        return 'bi-file-code-fill';
    }
    
    return 'bi-file-earmark-text-fill';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function updateBreadcrumb() {
    const pathBar = document.querySelector('.uss-path');
    const parts = currentPath.split('/').filter(p => p);
    
    let breadcrumbHtml = '<div class="breadcrumb-nav">';
    breadcrumbHtml += `<a href="#" class="breadcrumb-item" onclick="loadDirectory('/'); return false;">/</a>`;
    
    let fullPath = '';
    parts.forEach((part, index) => {
        fullPath += '/' + part;
        const isLast = index === parts.length - 1;
        const className = isLast ? 'breadcrumb-item active' : 'breadcrumb-item';
        
        if (!isLast) {
            breadcrumbHtml += '<span class="breadcrumb-separator">/</span>';
            breadcrumbHtml += `<a href="#" class="${className}" onclick="loadDirectory('${fullPath}'); return false;">${part}</a>`;
        } else {
            breadcrumbHtml += '<span class="breadcrumb-separator">/</span>';
            breadcrumbHtml += `<span class="${className}">${part}</span>`;
        }
    });
    
    breadcrumbHtml += '</div>';
    pathBar.innerHTML = breadcrumbHtml;
}

function updateStats() {
    const dirCount = files.filter(f => f.type === 'directory').length;
    const fileCount = files.filter(f => f.type !== 'directory').length;
    const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);
    
    document.getElementById('totalItems').textContent = files.length;
    document.getElementById('directoryCount').textContent = dirCount;
    document.getElementById('fileCount').textContent = fileCount;
}

function handleFileClick(name, type) {
    if (type === 'directory') {
        const newPath = currentPath.endsWith('/') ? currentPath + name : currentPath + '/' + name;
        loadDirectory(newPath);
    } else {
        viewFile(name);
    }
}

async function viewFile(filename) {
    const filepath = currentPath.endsWith('/') ? currentPath + filename : currentPath + '/' + filename;
    
    try {
        const response = await fetch(`/api/uss/file?path=${encodeURIComponent(filepath)}`);
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        showFileModal('View File', filename, data.content, true);
    } catch (error) {
        alert(`Error viewing file: ${error.message}`);
    }
}

async function editFile(filename) {
    const filepath = currentPath.endsWith('/') ? currentPath + filename : currentPath + '/' + filename;
    
    try {
        const response = await fetch(`/api/uss/file?path=${encodeURIComponent(filepath)}`);
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        showFileModal('Edit File', filename, data.content, false);
    } catch (error) {
        alert(`Error loading file: ${error.message}`);
    }
}

function showFileModal(title, filename, content, readonly) {
    const modal = document.getElementById('fileModal');
    const modalTitle = document.getElementById('fileModalTitle');
    const fileContent = document.getElementById('fileContent');
    const saveBtn = document.getElementById('saveFileBtn');
    
    modalTitle.textContent = `${title}: ${filename}`;
    fileContent.value = content;
    fileContent.readOnly = readonly;
    
    saveBtn.style.display = readonly ? 'none' : 'inline-block';
    saveBtn.onclick = () => saveFile(filename);
    
    modal.classList.add('show');
}

async function saveFile(filename) {
    const filepath = currentPath.endsWith('/') ? currentPath + filename : currentPath + '/' + filename;
    const content = document.getElementById('fileContent').value;
    
    try {
        const response = await fetch(`/api/uss/file`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                path: filepath,
                content: content
            })
        });
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        alert('File saved successfully');
        closeModal('fileModal');
        loadDirectory();
    } catch (error) {
        alert(`Error saving file: ${error.message}`);
    }
}

async function downloadFile(filename) {
    const filepath = currentPath.endsWith('/') ? currentPath + filename : currentPath + '/' + filename;
    window.location.href = `/api/uss/download?path=${encodeURIComponent(filepath)}`;
}

async function deleteFile(filename, type) {
    const itemType = type === 'directory' ? 'directory' : 'file';
    if (!confirm(`Are you sure you want to delete this ${itemType}: ${filename}?`)) {
        return;
    }
    
    const filepath = currentPath.endsWith('/') ? currentPath + filename : currentPath + '/' + filename;
    
    try {
        const response = await fetch(`/api/uss/file?path=${encodeURIComponent(filepath)}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        alert(`${itemType} deleted successfully`);
        loadDirectory();
    } catch (error) {
        alert(`Error deleting ${itemType}: ${error.message}`);
    }
}

function navigateUp() {
    if (currentPath === '/') return;
    const parts = currentPath.split('/').filter(p => p);
    parts.pop();
    const newPath = parts.length > 0 ? '/' + parts.join('/') : '/';
    loadDirectory(newPath);
}

function refreshDirectory() {
    loadDirectory();
}

function showNewFileModal() {
    const modal = document.getElementById('newFileModal');
    document.getElementById('newFileName').value = '';
    modal.classList.add('show');
}

function showNewDirectoryModal() {
    const modal = document.getElementById('newDirectoryModal');
    document.getElementById('newDirectoryName').value = '';
    modal.classList.add('show');
}

async function createNewFile() {
    const filename = document.getElementById('newFileName').value.trim();
    
    if (!filename) {
        alert('Please enter a filename');
        return;
    }
    
    const filepath = currentPath.endsWith('/') ? currentPath + filename : currentPath + '/' + filename;
    
    try {
        const response = await fetch(`/api/uss/file`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                path: filepath,
                content: ''
            })
        });
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        alert('File created successfully');
        closeModal('newFileModal');
        loadDirectory();
    } catch (error) {
        alert(`Error creating file: ${error.message}`);
    }
}

async function createNewDirectory() {
    const dirname = document.getElementById('newDirectoryName').value.trim();
    
    if (!dirname) {
        alert('Please enter a directory name');
        return;
    }
    
    const dirpath = currentPath.endsWith('/') ? currentPath + dirname : currentPath + '/' + dirname;
    
    try {
        const response = await fetch(`/api/uss/directory`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                path: dirpath
            })
        });
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        alert('Directory created successfully');
        closeModal('newDirectoryModal');
        loadDirectory();
    } catch (error) {
        alert(`Error creating directory: ${error.message}`);
    }
}

function showUploadModal() {
    const modal = document.getElementById('uploadModal');
    modal.classList.add('show');
}

function handleFileUpload(input) {
    const file = input.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
        const content = e.target.result;
        const filepath = currentPath.endsWith('/') ? currentPath + file.name : currentPath + '/' + file.name;
        
        try {
            const response = await fetch(`/api/uss/file`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    path: filepath,
                    content: content
                })
            });
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            alert('File uploaded successfully');
            closeModal('uploadModal');
            loadDirectory();
        } catch (error) {
            alert(`Error uploading file: ${error.message}`);
        }
    };
    reader.readAsText(file);
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

document.addEventListener('DOMContentLoaded', function() {
    // Close modals on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
            }
        });
    });
    
    loadDirectory();
});