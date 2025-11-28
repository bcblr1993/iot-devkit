/**
 * @fileoverview 核心MQTT模拟控制器
 * 负责创建、管理所有虚拟设备，并处理它们的生命周期
 */
const mqtt = require('mqtt');
const { generateBatteryStatus, generateTnPayload, generateTnEmptyPayload, generateTypedData, mergeCustomKeys } = require('./DataGenerator');
const SchemaGenerator = require('./SchemaGenerator');

class MqttController {
    constructor() {
        this.config = null;
        this.clients = [];
        // Map<clientId, Array<intervalId>>
        this.clientIntervals = new Map();
        this.isRunning = false;
        this.logCallback = null;
    }

    /**
     * 内部日志方法
     * @param {string} message - 要记录的消息
     * @param {string} type - 日志类型: 'info', 'success', 'error', 'data'
     */
    log(message, type = 'info') {
        if (this.isRunning && typeof this.logCallback === 'function') {
            this.logCallback({
                message,
                type,
                timestamp: new Date().toLocaleTimeString()
            });
        } else {
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
        this.isRunning = true;

        if (this.config.mode === 'advanced' && this.config.advanced && this.config.advanced.groups) {
            this.startAdvancedMode();
        } else {
            this.startBasicMode();
        }
    }

    startBasicMode() {
        const deviceCount = this.config.device_end_number - this.config.device_start_number + 1;
        this.log(`[Controller] 启动基础模式, 设备范围: [${this.config.device_start_number} - ${this.config.device_end_number}], 共 ${deviceCount} 个设备...`, 'info');

        for (let i = this.config.device_start_number; i <= this.config.device_end_number; i++) {
            // Use root-level prefixes for basic mode
            const mqttConfig = {
                ...this.config.mqtt,
                device_prefix: this.config.device_prefix,
                client_id_prefix: this.config.client_id_prefix,
                username_prefix: this.config.username_prefix,
                password_prefix: this.config.password_prefix,
            };

            this.createClient(i, mqttConfig, (client, clientId) => {
                // 基础模式的定时器逻辑
                const intervalId = setInterval(() => {
                    let payload;
                    switch (this.config.data.format) {
                        case 'tn':
                            payload = generateTnPayload(this.config.data.data_point_count);
                            break;
                        case 'tn-empty':
                            payload = generateTnEmptyPayload();
                            break;
                        default:
                            payload = generateBatteryStatus(this.config.data.data_point_count);
                            break;
                    }

                    // Merge custom keys if defined
                    if (this.config.custom_keys && this.config.custom_keys.length > 0) {
                        payload = mergeCustomKeys(payload, this.config.custom_keys);
                    }

                    const msg = JSON.stringify(payload);
                    client.publish(this.config.mqtt.topic, msg, (err) => {
                        if (err) this.log(`[${clientId}] 发送失败: ${err.message}`, 'error');
                    });
                }, this.config.mqtt.send_interval * 1000);

                this.addInterval(clientId, intervalId);
            });
        }
    }

    startAdvancedMode() {
        this.log('[Controller] 启动高级模式...', 'info');

        this.config.advanced.groups.forEach(group => {
            const count = group.end - group.start + 1;
            this.log(`[Controller] 启动分组 "${group.name}": 设备 [${group.start} - ${group.end}], Key数量: ${group.keyCount}`, 'info');

            for (let i = group.start; i <= group.end; i++) {
                // 为每个设备生成固定的 Schema
                const schema = SchemaGenerator.generate(group.keyCount, group.typeRatio);

                // 使用组特定的前缀配置
                const mqttConfig = {
                    ...this.config.mqtt, // 基础配置（Host, Port等）
                    device_prefix: group.devicePrefix,
                    client_id_prefix: group.clientIdPrefix,
                    username_prefix: group.usernamePrefix,
                    password_prefix: group.passwordPrefix,
                };

                this.createClient(i, mqttConfig, (client, clientId) => {
                    // 1. 全量上报定时器
                    const fullIntervalId = setInterval(() => {
                        let data = generateTypedData(schema, group.keyCount); // 全量

                        // Merge custom keys if defined
                        if (group.customKeys && group.customKeys.length > 0) {
                            data = mergeCustomKeys(data, group.customKeys);
                        }

                        client.publish(this.config.mqtt.topic, JSON.stringify(data), (err) => {
                            if (err) this.log(`[${clientId}] 全量上报失败: ${err.message}`, 'error');
                        });
                    }, group.fullInterval * 1000);
                    this.addInterval(clientId, fullIntervalId);

                    // 2. 变化上报定时器
                    const changeCount = Math.floor(group.keyCount * group.changeRatio);
                    if (changeCount > 0) {
                        const changeIntervalId = setInterval(() => {
                            let data = generateTypedData(schema, changeCount); // 前 N%

                            // Merge custom keys if defined
                            if (group.customKeys && group.customKeys.length > 0) {
                                data = mergeCustomKeys(data, group.customKeys);
                            }

                            client.publish(this.config.mqtt.topic, JSON.stringify(data), (err) => {
                                if (err) this.log(`[${clientId}] 变化上报失败: ${err.message}`, 'error');
                            });
                        }, group.changeInterval * 1000);
                        this.addInterval(clientId, changeIntervalId);
                    }
                });
            }
        });
    }

    createClient(deviceIndex, mqttConfig, onConnect) {
        // 使用各自独立的前缀
        const clientIdPrefix = mqttConfig.client_id_prefix || mqttConfig.username_prefix || 'device';
        const usernamePrefix = mqttConfig.username_prefix || 'device';
        const passwordPrefix = mqttConfig.password_prefix || 'device';

        const clientId = `${clientIdPrefix}${deviceIndex}`;
        const username = `${usernamePrefix}${deviceIndex}`;
        const password = `${passwordPrefix}${deviceIndex}`;

        const options = {
            clientId,
            username,
            password,
            clean: true,
            connectTimeout: 4000,
            reconnectPeriod: 5000
        };

        const client = mqtt.connect(`mqtt://${mqttConfig.host}:${mqttConfig.port}`, options);
        this.clients.push(client);

        client.on('connect', () => {
            this.log(`[${clientId}] 连接成功!`, 'success');

            // 清除旧定时器
            this.clearIntervals(clientId);

            // 执行连接后的回调（启动定时器）
            onConnect(client, clientId);
        });

        client.on('error', (err) => {
            this.log(`[${clientId}] 连接错误: ${err.message}`, 'error');
        });

        client.on('close', () => {
            this.log(`[${clientId}] 连接关闭。`, 'info');
            this.clearIntervals(clientId);
        });
    }

    addInterval(clientId, intervalId) {
        if (!this.clientIntervals.has(clientId)) {
            this.clientIntervals.set(clientId, []);
        }
        this.clientIntervals.get(clientId).push(intervalId);
    }

    clearIntervals(clientId) {
        if (this.clientIntervals.has(clientId)) {
            const intervals = this.clientIntervals.get(clientId);
            intervals.forEach(id => clearInterval(id));
            this.clientIntervals.delete(clientId);
        }
    }

    stop() {
        if (!this.isRunning) {
            console.log('[Controller-Suppressed] 模拟尚未运行，无需停止。');
            return;
        }

        this.isRunning = false;
        if (typeof this.logCallback === 'function') {
            this.logCallback({ message: '[Controller] 正在停止所有模拟设备...', type: 'info', timestamp: new Date().toLocaleTimeString() });
            this.logCallback({ message: '[Controller] 所有设备已停止，模拟结束。', type: 'info', timestamp: new Date().toLocaleTimeString() });
        }

        // 清除所有定时器
        for (const clientId of this.clientIntervals.keys()) {
            this.clearIntervals(clientId);
        }
        this.clientIntervals.clear();

        // 遍历所有客户端进行清理
        this.clients.forEach(client => {
            try {
                client.end(true);
                client.removeAllListeners();
            } catch (e) {
                console.error(`[Controller] 关闭单个客户端时出错: ${e.message}`);
            }
        });

        this.clients = [];
        this.logCallback = null;
    }
}

module.exports = MqttController;