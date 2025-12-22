/**
 * @fileoverview Logger UI - 日志显示组件
 */

import { getElement } from '../utils/dom-helpers.js';

export class LoggerUI {
    constructor() {
        this.logContainer = getElement('log-container');
        this.searchInput = getElement('log-search');
        this.autoScrollBtn = getElement('log-auto-scroll-btn');
        this.maximizeBtn = getElement('log-maximize-btn');
        this.logSection = getElement('log-section');

        this.allLogs = []; // Store all logs
        this.currentFilter = '';
        this.MAX_DOM_LOGS = 100; // Reduced from 500 to prevent tile memory issues
        this.MAX_STORED_LOGS = 1000; // Maximum stored logs for search

        this.isAutoScroll = true;
        this.isMaximized = false;

        this.setupSearchListener();
        this.setupControlListeners();
    }

    setupControlListeners() {
        // Auto Scroll Toggle
        if (this.autoScrollBtn) {
            this.autoScrollBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent header collapse
                this.isAutoScroll = !this.isAutoScroll;
                this.updateAutoScrollState();
            });
        }

        // Maximize Toggle
        if (this.maximizeBtn) {
            this.maximizeBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent header collapse
                this.toggleMaximize();
            });
        }

        // Search Input: Stop propagation to prevent collapsing when clicking/typing
        if (this.searchInput) {
            this.searchInput.addEventListener('click', (e) => {
                e.stopPropagation();
            });

            // Auto expand when focusing search
            this.searchInput.addEventListener('focus', () => {
                if (this.logSection && this.logSection.classList.contains('collapsed')) {
                    this.logSection.classList.remove('collapsed');
                }
            });
        }
    }

    updateAutoScrollState() {
        if (this.autoScrollBtn) {
            if (this.isAutoScroll) {
                this.autoScrollBtn.classList.add('active');
                this.autoScrollBtn.title = '自动滚动: 开';
                this.autoScrollBtn.textContent = '📜';
            } else {
                this.autoScrollBtn.classList.remove('active');
                this.autoScrollBtn.title = '自动滚动: 关';
                this.autoScrollBtn.textContent = '⏸️';
            }
        }
    }

    toggleMaximize() {
        this.isMaximized = !this.isMaximized;
        if (this.logSection) {
            this.logSection.classList.toggle('maximized', this.isMaximized);
            // Ensure not collapsed when maximized
            if (this.isMaximized) {
                this.logSection.classList.remove('collapsed');
            }
        }

        if (this.maximizeBtn) {
            if (this.isMaximized) {
                this.maximizeBtn.classList.add('active');
                this.maximizeBtn.textContent = '➖';
                this.maximizeBtn.title = '还原';
            } else {
                this.maximizeBtn.classList.remove('active');
                this.maximizeBtn.textContent = '⛶';
                this.maximizeBtn.title = '最大化';
            }
        }
    }

    setupSearchListener() {
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => {
                this.currentFilter = e.target.value.toLowerCase().trim();
                this.filterLogs();
            });
        }
    }

    /**
     * 添加日志条目
     * @param {Object} logEntry - 日志对象
     * @param {string} logEntry.message - 日志消息
     * @param {string} logEntry.type - 日志类型 (info|success|error|warning)
     * @param {string} logEntry.timestamp - 时间戳
     */
    addEntry(logEntry) {
        if (!this.logContainer) return;

        // Store log entry
        this.allLogs.push(logEntry);

        // Limit stored logs to prevent memory issues
        if (this.allLogs.length > this.MAX_STORED_LOGS) {
            this.allLogs.shift();
        }

        // Only add to DOM if it matches current filter
        if (this.matchesFilter(logEntry)) {
            const logDiv = this.createLogElement(logEntry);
            this.logContainer.appendChild(logDiv);

            // **CRITICAL: Limit DOM elements to prevent memory leak**
            // Remove oldest DOM element if exceeding limit
            while (this.logContainer.children.length > this.MAX_DOM_LOGS) {
                this.logContainer.removeChild(this.logContainer.firstChild);
            }

            // Auto-scroll to bottom only if enabled
            if (this.isAutoScroll) {
                this.logContainer.scrollTop = this.logContainer.scrollHeight;
            }
        }
    }

    /**
     * Get color for a group ID
     */
    getGroupColor(groupId) {
        if (!groupId) return null;

        // Modern, neon-like palette for dark theme
        const palette = [
            '#06b6d4', // Cyan
            '#f472b6', // Pink
            '#a78bfa', // Purple
            '#34d399', // Emerald
            '#fbbf24', // Amber
            '#60a5fa', // Blue
            '#fb7185', // Rose
            '#a3e635'  // Lime
        ];

        // Simple hash to select color
        let hash = 0;
        for (let i = 0; i < groupId.length; i++) {
            hash = groupId.charCodeAt(i) + ((hash << 5) - hash);
        }

        const index = Math.abs(hash) % palette.length;
        return palette[index];
    }

    createLogElement(logEntry) {
        const logDiv = document.createElement('div');
        logDiv.className = `log-entry log-${logEntry.type || 'info'}`;

        const timestampSpan = document.createElement('span');
        timestampSpan.className = 'log-timestamp';
        timestampSpan.textContent = logEntry.timestamp || new Date().toLocaleString('zh-CN', { hour12: false });

        const messageSpan = document.createElement('span');
        messageSpan.className = 'log-message';

        let messageHtml = logEntry.message;

        // Apply group coloring if context exists
        if (logEntry.context && logEntry.context.groupId) {
            const color = this.getGroupColor(logEntry.context.groupId);
            if (color) {
                // Regex to find [Prefix] at start or similar patterns
                // We expect format: [ClientId] Message...
                // Let's color the first bracketed part
                messageHtml = messageHtml.replace(/^(\[[^\]]+\])/, `<span style="color: ${color}; font-weight: bold;">$1</span>`);
            }
        }

        // Highlight search term if exists (apply over the HTML)
        if (this.currentFilter) {
            // Note: simple replace might break HTML tags if search matches tags, 
            // but here we just added a simple span. To be safe, we should ideally highlight text content only
            // but for simplicity and performance in this specific log format:
            // We'll rely on the fact that search terms usually aren't "span" or "style".
            // A better approach for robust highlighting with HTML:
            // 1. Text only -> highlight -> then apply color prefix.
            // But we already constructed HTML.
            // Let's reconstruct:

            // Re-implement order: 
            // 1. Get raw text
            const rawText = logEntry.message;

            // 2. Highlight text
            let processedText = this.highlightText(rawText, this.currentFilter);

            // 3. Apply group color to the already highlighted text's prefix
            if (logEntry.context && logEntry.context.groupId) {
                const color = this.getGroupColor(logEntry.context.groupId);
                if (color) {
                    processedText = processedText.replace(/^(\[[^\]]+\])/, `<span style="color: ${color}; font-weight: bold;">$1</span>`);
                    // Also handle if the bracket itself was highlighted (e.g. search for "[")
                    // The regex above works on plain text. If highlighted, it might be <mark>[</mark>...
                    // Complex. Let's stick to the previous simple logic for now:
                    // Color the prefix first, then highlight.
                    // But highlightText expects string.

                    // Alternative: Just set the style on the messageSpan if it's a simple match?
                    // No, user wants the prefix colored.
                }
            }
            messageSpan.innerHTML = processedText;
        } else {
            // No filter, just apply color
            if (logEntry.context && logEntry.context.groupId) {
                const color = this.getGroupColor(logEntry.context.groupId);
                if (color) {
                    messageHtml = messageHtml.replace(/^(\[[^\]]+\])/, `<span style="color: ${color}; font-weight: bold;">$1</span>`);
                }
            }
            messageSpan.innerHTML = messageHtml;
        }

        logDiv.appendChild(timestampSpan);
        logDiv.appendChild(messageSpan);

        // Display JSON data if filter is active and data exists
        if (this.currentFilter && logEntry.data) {
            const wrapper = document.createElement('div');
            wrapper.className = 'log-data-wrapper';

            const dataDiv = document.createElement('div');
            dataDiv.className = 'log-data';
            const jsonString = JSON.stringify(logEntry.data, null, 2);
            dataDiv.textContent = jsonString;

            // Actions container
            const actions = document.createElement('div');
            actions.className = 'log-actions';

            // Copy button
            const copyBtn = document.createElement('button');
            copyBtn.className = 'log-btn';
            copyBtn.textContent = '📋 复制';
            copyBtn.title = '复制 JSON';
            copyBtn.onclick = (e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(jsonString).then(() => {
                    const originalText = copyBtn.textContent;
                    copyBtn.textContent = '✅ 已复制';
                    setTimeout(() => copyBtn.textContent = originalText, 2000);
                });
            };

            // Expand/Collapse button
            const expandBtn = document.createElement('button');
            expandBtn.className = 'log-btn';
            expandBtn.textContent = '展开';
            expandBtn.onclick = (e) => {
                e.stopPropagation();
                dataDiv.classList.toggle('expanded');
                expandBtn.textContent = dataDiv.classList.contains('expanded') ? '收起' : '展开';
            };

            actions.appendChild(copyBtn);
            actions.appendChild(expandBtn);

            wrapper.appendChild(dataDiv);
            wrapper.appendChild(actions);
            logDiv.appendChild(wrapper);
        }

        return logDiv;
    }

    matchesFilter(logEntry) {
        if (!this.currentFilter) return true;

        const message = logEntry.message.toLowerCase();
        const timestamp = (logEntry.timestamp || '').toLowerCase();

        return message.includes(this.currentFilter) || timestamp.includes(this.currentFilter);
    }

    highlightText(text, searchTerm) {
        if (!searchTerm) return text;

        const regex = new RegExp(`(${searchTerm})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    filterLogs() {
        if (!this.logContainer) return;

        // Clear container
        this.logContainer.innerHTML = '';

        // Re-render filtered logs
        this.allLogs.forEach(logEntry => {
            if (this.matchesFilter(logEntry)) {
                const logDiv = this.createLogElement(logEntry);
                this.logContainer.appendChild(logDiv);
            }
        });

        // Scroll to bottom
        this.logContainer.scrollTop = this.logContainer.scrollHeight;

        // Show filter status
        this.updateFilterStatus();
    }

    updateFilterStatus() {
        if (!this.searchInput) return;

        if (this.currentFilter) {
            const visibleCount = this.logContainer.children.length;
            const totalCount = this.allLogs.length;
            this.searchInput.title = `显示 ${visibleCount} / ${totalCount} 条日志`;
        } else {
            this.searchInput.title = '搜索日志 (设备ID、消息内容...)';
        }
    }

    /**
     * 清空日志
     */
    clear() {
        if (this.logContainer) {
            this.logContainer.innerHTML = '';
        }
        this.allLogs = [];

        if (this.searchInput) {
            this.searchInput.value = '';
            this.currentFilter = '';
            this.updateFilterStatus();
        }
    }
}
