const CONFIG = {
    apiBase: '/api',
    refreshInterval: 30000, // 30 seconds
    animationDuration: 300
};

const Utils = {
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = Math.floor((now - date) / 1000); // seconds

        if (diff < 60) return `${diff} seconds ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
        if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;

        return date.toLocaleDateString('en-GB', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    },

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            Notifications.success('Copied to clipboard');
            return true;
        } catch (err) {
            console.error('Failed to copy:', err);
            Notifications.error('Failed to copy to clipboard');
            return false;
        }
    }
};

const Notifications = {
    container: null,

    init() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'notification-container';
            this.container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                max-width: 400px;
            `;
            document.body.appendChild(this.container);
        }
    },

    show(message, type = 'info', duration = 4000) {
        this.init();

        const icons = {
            success: 'check-circle-fill',
            error: 'x-circle-fill',
            warning: 'exclamation-triangle-fill',
            info: 'info-circle-fill'
        };

        const colors = {
            success: 'var(--success)',
            error: 'var(--danger)',
            warning: 'var(--warning)',
            info: 'var(--info)'
        };

        const notification = document.createElement('div');
        notification.className = 'notification glass';
        notification.style.cssText = `
            padding: 1rem 1.5rem;
            margin-bottom: 1rem;
            border-radius: 0.5rem;
            display: flex;
            align-items: center;
            gap: 1rem;
            animation: slideInRight 0.3s ease;
            border-left: 4px solid ${colors[type]};
            box-shadow: var(--shadow-lg);
        `;

        notification.innerHTML = `
            <i class="bi bi-${icons[type]}" style="font-size: 1.5rem; color: ${colors[type]};"></i>
            <div style="flex: 1; color: var(--text-primary);">${message}</div>
            <button class="btn-close btn-close-white" aria-label="Close"></button>
        `;

        const closeBtn = notification.querySelector('.btn-close');
        closeBtn.addEventListener('click', () => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        });

        this.container.appendChild(notification);

        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.style.animation = 'slideOutRight 0.3s ease';
                    setTimeout(() => notification.remove(), 300);
                }
            }, duration);
        }
    },

    success(message, duration) {
        this.show(message, 'success', duration);
    },

    error(message, duration) {
        this.show(message, 'error', duration);
    },

    warning(message, duration) {
        this.show(message, 'warning', duration);
    },

    info(message, duration) {
        this.show(message, 'info', duration);
    }
};

const Loading = {
    show(element, message = 'Loading...') {
        if (typeof element === 'string') {
            element = document.querySelector(element);
        }
        
        if (!element) return;

        const loader = document.createElement('div');
        loader.className = 'loading-overlay';
        loader.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(10, 14, 26, 0.8);
            backdrop-filter: blur(4px);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            border-radius: inherit;
        `;

        loader.innerHTML = `
            <div class="spinner-border" style="color: var(--primary);" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <div class="mt-3" style="color: var(--text-primary);">${message}</div>
        `;

        element.style.position = 'relative';
        element.appendChild(loader);
    },

    hide(element) {
        if (typeof element === 'string') {
            element = document.querySelector(element);
        }
        
        if (!element) return;

        const loader = element.querySelector('.loading-overlay');
        if (loader) {
            loader.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => loader.remove(), 300);
        }
    }
};

const API = {
    async request(endpoint, options = {}) {
        const url = `${CONFIG.apiBase}${endpoint}`;
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            }
        };

        try {
            const response = await fetch(url, { ...defaultOptions, ...options });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API Request failed:', error);
            Notifications.error(`Request failed: ${error.message}`);
            throw error;
        }
    },

    get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    },

    post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
};

const Theme = {
    current: 'dark',

    toggle() {
        this.current = this.current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', this.current);
        localStorage.setItem('theme', this.current);
    },

    init() {
        const saved = localStorage.getItem('theme');
        if (saved) {
            this.current = saved;
            document.documentElement.setAttribute('data-theme', this.current);
        }
    }
};

const styles = document.createElement('style');
styles.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }

    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }

    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }

    .pulse {
        animation: pulse 2s ease-in-out infinite;
    }
`;
document.head.appendChild(styles);

document.addEventListener('DOMContentLoaded', function() {
    console.log('%c🚀 KdG Mainframe Control Center', 'color: #3b82f6; font-size: 20px; font-weight: bold;');
    console.log('%cInitialized successfully', 'color: #10b981;');
    
    Theme.init();
    
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    console.log('System ready for mainframe operations');
});

// Export for global use
window.Utils = Utils;
window.Notifications = Notifications;
window.Loading = Loading;
window.API = API;
window.Theme = Theme;