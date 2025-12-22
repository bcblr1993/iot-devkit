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
            <div class="stats-bar">
                <div class="stat-item compact">
                    <span class="stat-icon">🟢</span>
                    <span class="stat-val" id="stat-online">0</span>
                </div>
                <div class="stat-item compact">
                    <span class="stat-icon">🔴</span>
                    <span class="stat-val" id="stat-offline">0</span>
                </div>
                <div class="stat-divider"></div>
                <div class="stat-item compact">
                    <span class="stat-icon">📤</span>
                    <span class="stat-val" id="stat-total">0</span>
                </div>
                <div class="stat-item compact">
                    <span class="stat-icon">✅</span>
                    <span class="stat-val" id="stat-success">0%</span>
                </div>
                <div class="stat-item compact">
                    <span class="stat-icon">❌</span>
                    <span class="stat-val" id="stat-failure">0%</span>
                </div>
                <div class="stat-divider"></div>
                <div class="stat-item compact">
                    <span class="stat-icon">⏱️</span>
                    <span class="stat-val" id="stat-latency">0ms</span>
                </div>
                <div class="stat-item compact flex-grow">
                    <span class="stat-icon">📦</span>
                    <span class="stat-val" id="stat-msg-size">0 B</span>
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
        if (totalEl) totalEl.textContent = stats.totalMessages.toLocaleString() + ' 条';
        if (successEl) successEl.textContent = stats.successRate + '%';
        if (failureEl) failureEl.textContent = stats.failureRate + '%';
        if (latencyEl) latencyEl.textContent = stats.avgLatency + 'ms';

        // Update Message Sizes
        const msgSizeEl = document.getElementById('stat-msg-size');
        if (msgSizeEl) {
            const size = stats.messageSize || 0;
            msgSizeEl.textContent = size + (stats.groupMessageSizes ? '+' : '');
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
