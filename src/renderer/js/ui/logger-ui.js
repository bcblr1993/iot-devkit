/**
 * @fileoverview Logger UI - 日志显示组件
 */

import { getElement } from '../utils/dom-helpers.js';

export class LoggerUI {
    constructor() {
        this.logContainer = getElement('log-container');
        this.searchInput = getElement('log-search');
        this.allLogs = []; // Store all logs
        this.currentFilter = '';

        this.setupSearchListener();
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

        // Debug log to check data payload
        if (logEntry.data) {
            console.log('Received log with data:', logEntry);
        }

        // Store log entry
        this.allLogs.push(logEntry);

        // Create log element
        const logDiv = this.createLogElement(logEntry);

        // Check if it matches current filter
        if (this.matchesFilter(logEntry)) {
            this.logContainer.appendChild(logDiv);
            this.logContainer.scrollTop = this.logContainer.scrollHeight;
        }

        // Limit stored logs to prevent memory issues (keep last 1000)
        if (this.allLogs.length > 1000) {
            this.allLogs.shift();
        }
    }

    createLogElement(logEntry) {
        const logDiv = document.createElement('div');
        logDiv.className = `log-entry log-${logEntry.type || 'info'}`;

        const timestampSpan = document.createElement('span');
        timestampSpan.className = 'log-timestamp';
        timestampSpan.textContent = logEntry.timestamp || new Date().toLocaleTimeString();

        const messageSpan = document.createElement('span');
        messageSpan.className = 'log-message';

        // Highlight search term if exists
        if (this.currentFilter) {
            messageSpan.innerHTML = this.highlightText(logEntry.message, this.currentFilter);
        } else {
            messageSpan.textContent = logEntry.message;
        }

        logDiv.appendChild(timestampSpan);
        logDiv.appendChild(messageSpan);

        // Display JSON data if filter is active and data exists
        if (this.currentFilter && logEntry.data) {
            const dataDiv = document.createElement('div');
            dataDiv.className = 'log-data';
            // Format JSON with indentation
            dataDiv.textContent = JSON.stringify(logEntry.data, null, 2);
            logDiv.appendChild(dataDiv);
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
