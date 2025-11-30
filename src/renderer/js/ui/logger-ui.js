/**
 * @fileoverview Logger UI - 日志显示组件
 */

import { getElement } from '../utils/dom-helpers.js';

export class LoggerUI {
    constructor() {
        this.logContainer = getElement('log-container');
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

        const logDiv = document.createElement('div');
        logDiv.className = `log-entry log-${logEntry.type || 'info'}`;

        const timestampSpan = document.createElement('span');
        timestampSpan.className = 'log-timestamp';
        timestampSpan.textContent = logEntry.timestamp || new Date().toLocaleTimeString();

        const messageSpan = document.createElement('span');
        messageSpan.className = 'log-message';
        messageSpan.textContent = logEntry.message;

        logDiv.appendChild(timestampSpan);
        logDiv.appendChild(messageSpan);

        this.logContainer.appendChild(logDiv);
        this.logContainer.scrollTop = this.logContainer.scrollHeight;
    }

    /**
     * 清空日志
     */
    clear() {
        if (this.logContainer) {
            this.logContainer.innerHTML = '';
        }
    }
}
