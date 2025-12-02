/**
 * @fileoverview 统计数据收集器
 * 高性能统计模块，采用批量更新策略减少 IPC 开销
 */

class StatisticsCollector {
    constructor() {
        this.stats = {
            onlineDevices: 0,           // 在线设备数
            totalMessages: 0,           // 累计消息数
            successCount: 0,            // 成功次数
            failureCount: 0,            // 失败次数
            totalLatency: 0,            // 总延迟(ms)
            latencySamples: 0           // 延迟采样数
        };

        // 性能优化：每秒最多更新一次 UI
        this.updateTimer = null;
        this.needsUpdate = false;
        this.onUpdateCallback = null;
    }

    /**
     * 设置更新回调
     */
    setUpdateCallback(callback) {
        this.onUpdateCallback = callback;
    }

    /**
     * 增加成功计数
     * @param {number} latency - 延迟时间(ms)，可选
     */
    incrementSuccess(latency = 0) {
        this.stats.totalMessages++;
        this.stats.successCount++;

        // 延迟采样：每 10 条消息采样一次（减少 90% 计算）
        if (latency > 0 && this.stats.successCount % 10 === 0) {
            this.stats.totalLatency += latency;
            this.stats.latencySamples++;
        }

        this.scheduleUpdate();
    }

    /**
     * 增加失败计数
     */
    incrementFailure() {
        this.stats.totalMessages++;
        this.stats.failureCount++;
        this.scheduleUpdate();
    }

    /**
     * 批量合并 Worker 统计数据
     */
    mergeWorkerStats(workerStats) {
        if (workerStats.successCount) {
            this.stats.totalMessages += workerStats.successCount;
            this.stats.successCount += workerStats.successCount;
        }
        if (workerStats.failureCount) {
            this.stats.totalMessages += workerStats.failureCount;
            this.stats.failureCount += workerStats.failureCount;
        }
        this.scheduleUpdate();
    }

    /**
     * 设置在线设备数
     */
    setOnlineDevices(count) {
        this.stats.onlineDevices = count;
        this.scheduleUpdate();
    }

    /**
     * 延迟更新，避免频繁 IPC（每秒最多 1 次）
     */
    scheduleUpdate() {
        if (!this.needsUpdate) {
            this.needsUpdate = true;
            if (!this.updateTimer) {
                this.updateTimer = setTimeout(() => {
                    this.flushToUI();
                }, 1000); // 每秒最多更新一次
            }
        }
    }

    /**
     * 立即刷新到 UI
     */
    flushToUI() {
        if (this.onUpdateCallback && typeof this.onUpdateCallback === 'function') {
            this.onUpdateCallback(this.getSnapshot());
        }
        this.needsUpdate = false;
        this.updateTimer = null;
    }

    /**
     * 获取统计快照
     */
    getSnapshot() {
        const total = this.stats.successCount + this.stats.failureCount;
        const avgLatency = this.stats.latencySamples > 0
            ? (this.stats.totalLatency / this.stats.latencySamples).toFixed(2)
            : '0.00';

        return {
            onlineDevices: this.stats.onlineDevices,
            totalMessages: this.stats.totalMessages,
            successRate: total > 0 ? ((this.stats.successCount / total) * 100).toFixed(2) : '0.00',
            failureRate: total > 0 ? ((this.stats.failureCount / total) * 100).toFixed(2) : '0.00',
            avgLatency: avgLatency
        };
    }

    /**
     * 重置统计数据
     */
    reset() {
        this.stats = {
            onlineDevices: 0,
            totalMessages: 0,
            successCount: 0,
            failureCount: 0,
            totalLatency: 0,
            latencySamples: 0
        };

        if (this.updateTimer) {
            clearTimeout(this.updateTimer);
            this.updateTimer = null;
        }
        this.needsUpdate = false;

        // 立即发送重置后的数据
        if (this.onUpdateCallback) {
            this.onUpdateCallback(this.getSnapshot());
        }
    }
}

module.exports = StatisticsCollector;
