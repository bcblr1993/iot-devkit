/**
 * @fileoverview 核心MQTT模拟控制器
 * 负责创建、管理所有虚拟设备，并处理它们的生命周期
 */
const mqtt = require('mqtt');
const { generateBatteryStatus, generateTnPayload, generateTnEmptyPayload } = require('./DataGenerator'); // 【修改】导入新函数

class MqttController {
    constructor() {
        this.config = null;
        this.clients = [];
        this.clientIntervals = new Map(); // 【修改】使用 Map 管理每个客户端的定时器
        this.isRunning = false;
        this.logCallback = null; // 日志回调函数将由 main.js 传入
    }

    /**
     * 内部日志方法，增加运行状态检查
     * @param {string} message - 要记录的消息
     * @param {string} type - 日志类型: 'info', 'success', 'error', 'data'
     */
    log(message, type = 'info') {
        // 【核心修改】只有在 'isRunning' 状态为 true 时才发送日志到UI
        if (this.isRunning && typeof this.logCallback === 'function') {
            this.logCallback({
                message,
                type,
                timestamp: new Date().toLocaleTimeString()
            });
        } else {
            // 如果已停止，只在后台控制台打印，用于调试，不影响UI
            console.log(`[Controller-Suppressed] [${type}] ${message}`);
        }
    }

    /**
     * 启动模拟
     * @param {object} config - 从UI传递的配置对象
     * @param {function} logCallback - 用于更新UI的回调函数
     */
    start(config, logCallback) {
        if (this.isRunning) {
            this.log('[Controller] 模拟已经在运行中。', 'error');
            return;
        }

        this.config = config;
        this.logCallback = logCallback;
        this.isRunning = true; // 设置运行状态
        const deviceCount = this.config.device_end_number - this.config.device_start_number + 1;
        this.log(`[Controller] 准备启动模拟, 设备范围: [${this.config.device_start_number} - ${this.config.device_end_number}], 共 ${deviceCount} 个设备...`, 'info');

        for (let i = this.config.device_start_number; i <= this.config.device_end_number; i++) {
            const clientId = `${this.config.username_prefix}${String(i).padStart(2, '0')}`;
            const username = `${this.config.username_prefix}${String(i).padStart(2, '0')}`;
            const password = `${this.config.password_prefix}${String(i).padStart(2, '0')}`;

            const options = {
                clientId,
                username,
                password,
                clean: true,
                connectTimeout: 4000,
                reconnectPeriod: 5000 // 默认是1000ms，可以适当延长以减少错误频率
            };

            const client = mqtt.connect(`mqtt://${this.config.host}:${this.config.port}`, options);
            this.clients.push(client);

            client.on('connect', () => {
                this.log(`[${clientId}] 连接成功!`, 'success');

                // --- 【修复】防止重连导致定时器叠加 ---
                if (this.clientIntervals.has(clientId)) {
                    clearInterval(this.clientIntervals.get(clientId));
                    this.clientIntervals.delete(clientId);
                }

                // --- 【新增】生成并打印数据样本 ---

                // 1. 为了避免日志过长，我们只生成一个包含3个数据点的样本用于展示
                const sampleCountForLog = 10;
                let samplePayload;
                switch (this.config.format) {
                    case 'tn':
                        samplePayload = generateTnPayload(sampleCountForLog);
                        break;
                    case 'tn-empty':
                        samplePayload = generateTnEmptyPayload(); // tn-empty 不需要 count 参数
                        break;
                    default: // 'default' 或其他任何值都走这里
                        samplePayload = generateBatteryStatus(sampleCountForLog);
                        break;
                }

                // 2. 将样本对象转换为格式化的JSON字符串（带缩进，更易读）
                const samplePayloadString = JSON.stringify(samplePayload, null, 2);

                // 3. 打印包含配置信息和数据样本的详细日志
                this.log(`[${clientId}] 将以 ${this.config.send_interval} 秒/次的频率发送 "${this.config.format}" 格式数据 (共 ${this.config.data_point_count} 个数据点)。`, 'info');
                this.log(`[${clientId}] 数据示例如下 (仅展示 ${sampleCountForLog} 个数据点):\n${samplePayloadString}`, 'data');
                // --- 【新增修改结束】 ---

                const intervalId = setInterval(() => {
                    // 实际发送时，仍然使用用户配置的完整数据点数量
                    let payload;
                    switch (this.config.format) {
                        case 'tn':
                            payload = generateTnPayload(this.config.data_point_count);
                            break;
                        case 'tn-empty':
                            payload = generateTnEmptyPayload();
                            break;
                        default:
                            payload = generateBatteryStatus(this.config.data_point_count);
                            break;
                    }
                    const msg = JSON.stringify(payload);
                    client.publish(this.config.topic, msg, (err) => {
                        if (err) this.log(`[${clientId}] 发送失败: ${err.message}`, 'error');
                    });
                }, this.config.send_interval * 1000);

                this.clientIntervals.set(clientId, intervalId);
            });

            client.on('error', (err) => {
                this.log(`[${clientId}] 连接错误: ${err.message}`, 'error');
            });

            client.on('close', () => {
                this.log(`[${clientId}] 连接关闭。`, 'info');
                // 连接关闭时清除定时器
                if (this.clientIntervals.has(clientId)) {
                    clearInterval(this.clientIntervals.get(clientId));
                    this.clientIntervals.delete(clientId);
                }
            });
        }
    }

    /**
     * 停止模拟
     */
    stop() {
        if (!this.isRunning) {
            console.log('[Controller-Suppressed] 模拟尚未运行，无需停止。');
            return;
        }

        // 【核心修改】立刻将状态置为 false
        this.isRunning = false;
        // 显式地告诉UI模拟已停止
        if (typeof this.logCallback === 'function') {
            this.logCallback({ message: '[Controller] 正在停止所有模拟设备...', type: 'info', timestamp: new Date().toLocaleTimeString() });
            this.logCallback({ message: '[Controller] 所有设备已停止，模拟结束。', type: 'info', timestamp: new Date().toLocaleTimeString() });
        }

        // 清除所有定时器
        for (const intervalId of this.clientIntervals.values()) {
            clearInterval(intervalId);
        }
        this.clientIntervals.clear();

        // 遍历所有客户端进行清理
        this.clients.forEach(client => {
            try {
                client.end(true); // 强制结束
                client.removeAllListeners(); // 移除所有监听器
            } catch (e) {
                console.error(`[Controller] 关闭单个客户端时出错: ${e.message}`);
            }
        });

        // 清空客户端列表
        this.clients = [];
        this.logCallback = null; // 清理回调函数
    }
}

module.exports = MqttController;