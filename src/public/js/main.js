/**
 * Gigaset Central Phonebook - Main JavaScript
 */

(function() {
    'use strict';

    // ==========================================================================
    // Theme Management
    // ==========================================================================

    const THEME_KEY = 'gigaset-phonebook-theme';

    function getStoredTheme() {
        return localStorage.getItem(THEME_KEY);
    }

    function setStoredTheme(theme) {
        localStorage.setItem(THEME_KEY, theme);
    }

    function getPreferredTheme() {
        const stored = getStoredTheme();
        if (stored) {
            return stored;
        }
        return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }

    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        setStoredTheme(theme);

        // Update toggle label if it exists
        const label = document.querySelector('.theme-toggle-label');
        if (label) {
            label.textContent = theme === 'light' ? 'Light Mode' : 'Dark Mode';
        }
    }

    function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const newTheme = current === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
    }

    // Apply theme immediately on load (before DOM ready) to prevent flash
    setTheme(getPreferredTheme());

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
        if (!getStoredTheme()) {
            setTheme(e.matches ? 'light' : 'dark');
        }
    });

    // Expose toggle function globally
    window.toggleTheme = toggleTheme;

    // ==========================================================================
    // Toast Notifications
    // ==========================================================================

    const toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);

    function showToast(message, type = 'success', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <svg><use href="#icon-${type === 'success' ? 'check' : 'alert'}"></use></svg>
            <span class="toast-message">${message}</span>
        `;

        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('toast-out');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    window.showToast = showToast;

    // ==========================================================================
    // Sidebar Toggle (Mobile)
    // ==========================================================================

    const sidebar = document.querySelector('.sidebar');
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    const sidebarOverlay = document.querySelector('.sidebar-overlay');

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('mobile-open');
        });
    }

    if (sidebarOverlay && sidebar) {
        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('mobile-open');
        });
    }

    // Close sidebar on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sidebar && sidebar.classList.contains('mobile-open')) {
            sidebar.classList.remove('mobile-open');
        }
    });

    // ==========================================================================
    // Copy to Clipboard
    // ==========================================================================

    function copyToClipboard(text, button) {
        navigator.clipboard.writeText(text).then(() => {
            const originalHtml = button.innerHTML;
            button.innerHTML = '<svg><use href="#icon-check"></use></svg>';
            button.classList.add('copied');
            showToast('Copied to clipboard');

            setTimeout(() => {
                button.innerHTML = originalHtml;
                button.classList.remove('copied');
            }, 2000);
        }).catch(() => {
            showToast('Failed to copy', 'error');
        });
    }

    window.copyToClipboard = copyToClipboard;

    // ==========================================================================
    // Keyboard Shortcuts
    // ==========================================================================

    document.addEventListener('keydown', (e) => {
        // Alt+N: New contact (if add button exists)
        if (e.altKey && e.key === 'n') {
            const addBtn = document.getElementById('addBtn');
            if (addBtn) {
                e.preventDefault();
                addBtn.click();
            }
        }
    });

    // ==========================================================================
    // Active Nav Item
    // ==========================================================================

    const currentPath = window.location.pathname;
    const navItems = document.querySelectorAll('.sidebar-nav-item');

    navItems.forEach(item => {
        // Skip action items (import/export) - they don't get active state
        if (item.hasAttribute('data-action')) return;

        const href = item.getAttribute('href');
        if (href === currentPath || (href === '/' && currentPath === '/')) {
            item.classList.add('active');
        } else if (href !== '/' && currentPath.startsWith(href)) {
            item.classList.add('active');
        }
    });

})();
