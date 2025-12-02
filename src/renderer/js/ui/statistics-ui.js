/**
 * @fileoverview 统计数据UI组件
 * 显示实时设备统计信息
 */

class StatisticsUI {
    constructor() {
        this.container = document.getElementById('statistics-panel');
        if (!this.container) {
            console.error('[StatisticsUI] 未找到statistics-panel容器');
            return;
        }
        this.createUI();
    }

    /**
     * 创建UI结构
     */
    createUI() {
        this.container.innerHTML = `
            <div class="stats-header">
                <span class="stats-title">📊 实时统计</span>
            </div>
            <div class="stats-content">
                <div class="stats-row">
                    <div class="stat-item">
                        <span class="stat-icon">🟢</span>
                        <span class="stat-label">在线设备</span>
                        <span class="stat-value" id="stat-online">0</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-icon">🔴</span>
                        <span class="stat-label">离线设备</span>
                        <span class="stat-value" id="stat-offline">0</span>
                    </div>
                </div>
                <div class="stats-row">
                    <div class="stat-item">
                        <span class="stat-icon">📤</span>
                        <span class="stat-label">总消息</span>
                        <span class="stat-value" id="stat-total">0</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-icon">✅</span>
                        <span class="stat-label">成功率</span>
                        <span class="stat-value" id="stat-success">0%</span>
                    </div>
                </div>
                <div class="stats-row">
                    <div class="stat-item">
                        <span class="stat-icon">❌</span>
                        <span class="stat-label">失败率</span>
                        <span class="stat-value" id="stat-failure">0%</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-icon">⏱️</span>
                        <span class="stat-label">平均延迟</span>
                        <span class="stat-value" id="stat-latency">0.00ms</span>
                    </div>
                </div>
                <div class="stats-row" id="message-size-container">
                    <div class="stat-item" style="flex: 2;">
                        <span class="stat-icon">📦</span>
                        <span class="stat-label">消息大小 (Bytes)</span>
                        <div id="stat-message-sizes" class="stat-value-list">
                            <span class="stat-value" id="stat-msg-size">0</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 更新统计数据
     * @param {Object} stats - 统计数据对象
     */
    update(stats) {
        if (!stats) return;

        const onlineEl = document.getElementById('stat-online');
        const offlineEl = document.getElementById('stat-offline');
        const totalEl = document.getElementById('stat-total');
        const successEl = document.getElementById('stat-success');
        const failureEl = document.getElementById('stat-failure');
        const latencyEl = document.getElementById('stat-latency');

        if (onlineEl) onlineEl.textContent = stats.onlineDevices.toLocaleString();
        if (offlineEl) offlineEl.textContent = stats.offlineDevices.toLocaleString();
        if (totalEl) totalEl.textContent = stats.totalMessages.toLocaleString();
        if (successEl) successEl.textContent = stats.successRate + '%';
        if (failureEl) failureEl.textContent = stats.failureRate + '%';
        if (latencyEl) latencyEl.textContent = stats.avgLatency + 'ms';

        // Update Message Sizes
        const msgSizesContainer = document.getElementById('stat-message-sizes');
        if (msgSizesContainer) {
            if (stats.groupMessageSizes && Object.keys(stats.groupMessageSizes).length > 0) {
                // Advanced Mode: Show list of groups
                let html = '';
                for (const [groupName, size] of Object.entries(stats.groupMessageSizes)) {
                    html += `<div class="stat-sub-item"><span class="stat-sub-label">${groupName}:</span> <span class="stat-sub-value">${size} B</span></div>`;
                }
                msgSizesContainer.innerHTML = html;
            } else {
                // Basic Mode: Show single value
                const size = stats.messageSize || 0;
                msgSizesContainer.innerHTML = `<span class="stat-value">${size}</span>`;
            }
        }

        // 根据成功率添加视觉反馈
        if (successEl) {
            const rate = parseFloat(stats.successRate);
            if (rate >= 99) {
                successEl.classList.add('stat-value--good');
                successEl.classList.remove('stat-value--warning');
            } else if (rate >= 95) {
                successEl.classList.add('stat-value--warning');
                successEl.classList.remove('stat-value--good');
            } else {
                successEl.classList.remove('stat-value--good', 'stat-value--warning');
            }
        }
    }

    /**
     * 重置统计显示
     */
    reset() {
        this.update({
            totalDevices: 0,
            onlineDevices: 0,
            offlineDevices: 0,
            totalMessages: 0,
            successRate: '0.00',
            failureRate: '0.00',
            avgLatency: '0.00'
        });
    }
}

export default StatisticsUI;
