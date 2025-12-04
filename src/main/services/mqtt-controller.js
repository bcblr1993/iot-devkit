/**
 * @fileoverview 核心MQTT模拟控制器
 * 负责创建、管理所有虚拟设备，并处理它们的生命周期
 */
const mqtt = require('mqtt');
const { Worker } = require('worker_threads');
const path = require('path');
const { generateBatteryStatus, generateTnPayload, generateTnEmptyPayload, generateTypedData, mergeCustomKeys, getBasicTemplate, getOrCreateTemplate, clearTemplateCache } = require('./data-generator');
const SchemaGenerator = require('./schema-generator');
const StatisticsCollector = require('./statistics-collector');

class MqttController {
    constructor() {
        this.config = null;
        this.clients = [];
        // Map<clientId, Array<intervalId>>
        this.clientIntervals = new Map();
        this.isRunning = false;
        this.logCallback = null;

        // Worker Threads
        this.workers = [];
        this.useWorkers = false; // 可通过配置开启

        // Statistics
        this.statisticsCollector = new StatisticsCollector();

        // Track connected devices to prevent duplicate counting
        this.connectedDevices = new Set();
    }

    /**
     * 内部日志方法
     * @param {string} message - 要记录的消息
     * @param {string} type - 日志类型: 'info', 'success', 'error', 'data'
     * @param {Object} [data] - 可选的数据载荷
     */
    log(message, type = 'info', data = null) {
        if (this.isRunning && typeof this.logCallback === 'function') {
            this.logCallback({
                message,
                type,
                timestamp: new Date().toLocaleTimeString(),
                data
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

        // 判断是否使用 Worker 模式
        // 基础模式 + 设备数量 >= 500 时自动启用 Worker
        const deviceCount = this.config.device_end_number - this.config.device_start_number + 1;
        const shouldUseWorkers = this.config.mode === 'basic' && deviceCount >= 500;

        if (shouldUseWorkers) {
            this.log(`[Controller] 设备数量 ${deviceCount}，启用 Worker 多线程模式`, 'info');
            this.startWithWorkers();
        } else if (this.config.mode === 'advanced' && this.config.advanced && this.config.advanced.groups) {
            this.startAdvancedMode();
        } else {
            this.startBasicMode();
        }
    }

    startBasicMode() {
        this.log('[Controller] 启动基础模式...', 'info');

        const paddingLength = 2; // Fixed 2-digit padding

        // 重置并设置总设备数
        this.statisticsCollector.reset();
        const totalDevices = this.config.device_end_number - this.config.device_start_number + 1;
        this.statisticsCollector.setTotalDevices(totalDevices);

        this.log(`[Controller] 启动基础模式, 设备范围: [${this.config.device_start_number} - ${this.config.device_end_number}], 共 ${totalDevices} 个设备...`, 'info');

        for (let i = this.config.device_start_number; i <= this.config.device_end_number; i++) {
            // Use root-level prefixes for basic mode
            const mqttConfig = {
                ...this.config.mqtt,
                device_prefix: this.config.device_prefix,
                client_id_prefix: this.config.client_id_prefix,
                username_prefix: this.config.username_prefix,
                password_prefix: this.config.password_prefix,
            };

            this.createClient(i, mqttConfig, paddingLength, (client, clientId) => {
                // 基础模式的定时器逻辑
                const intervalSeconds = this.config.send_interval || 1;
                this.log(`[${clientId}] 启动定时发送，间隔: ${intervalSeconds}秒`, 'info');

                // 添加到已连接设备集合
                if (!this.connectedDevices.has(clientId)) {
                    this.connectedDevices.add(clientId);
                    this.statisticsCollector.setOnlineDevices(this.connectedDevices.size);
                }

                let sendCount = 0; // Counter for log sampling

                const intervalId = setInterval(() => {
                    // Generate fresh data each time (not cached) to ensure random values
                    const customKeyCount = (this.config.custom_keys && this.config.custom_keys.length) || 0;
                    const randomKeyCount = Math.max(0, this.config.data.data_point_count - customKeyCount);

                    let payload;
                    switch (this.config.data.format) {
                        case 'tn':
                            payload = generateTnPayload(randomKeyCount);
                            break;
                        case 'tn-empty':
                            payload = generateTnEmptyPayload();
                            break;
                        default:
                            payload = generateBatteryStatus(randomKeyCount);
                            break;
                    }

                    // Merge custom keys if defined
                    if (customKeyCount > 0) {
                        payload = mergeCustomKeys(payload, this.config.custom_keys);
                    }

                    const msg = JSON.stringify(payload);
                    const size = Buffer.byteLength(msg);
                    this.statisticsCollector.setMessageSize(size);

                    client.publish(this.config.mqtt.topic, msg, (err) => {
                        if (err) {
                            this.log(`[${clientId}] 发送失败: ${err.message}`, 'error');
                            this.statisticsCollector.incrementFailure();
                        } else {
                            sendCount++;
                            this.statisticsCollector.incrementSuccess();
                            // Log sampling: only log every 10 successful sends to reduce memory usage
                            if (sendCount % 10 === 1) {
                                this.log(`[${clientId}] 已发送 ${sendCount} 条消息`, 'success');
                            }
                        }
                    });
                }, intervalSeconds * 1000);

                this.addInterval(clientId, intervalId);
            });
        }
    }

    /**
     * 使用 Worker Threads 启动模拟（基础模式）
     */
    startWithWorkers() {
        const deviceCount = this.config.device_end_number - this.config.device_start_number + 1;

        // 重置并设置总设备数
        this.statisticsCollector.reset();
        this.statisticsCollector.setTotalDevices(deviceCount);

        // 动态计算 Worker 数量
        // 1. 获取系统 CPU 核心数，预留 1 个核心给主进程/渲染进程
        const os = require('os');
        const availableCores = Math.max(1, os.cpus().length - 1);

        // 2. 每个 Worker 最多处理 250 个设备
        // 3. Worker 数量上限为可用核心数
        const workerCount = Math.min(availableCores, Math.ceil(deviceCount / 250));
        const devicesPerWorker = Math.ceil(deviceCount / workerCount);

        this.log(`[Controller] 创建 ${workerCount} 个 Worker 线程，每个处理约 ${devicesPerWorker} 个设备`, 'info');

        // 计算自定义Key数量
        const customKeyCount = (this.config.custom_keys && this.config.custom_keys.length) || 0;
        const randomKeyCount = Math.max(0, this.config.data.data_point_count - customKeyCount);

        for (let i = 0; i < workerCount; i++) {
            const startIndex = this.config.device_start_number + i * devicesPerWorker;
            const endIndex = Math.min(
                startIndex + devicesPerWorker - 1,
                this.config.device_end_number
            );

            // 创建 Worker
            const worker = new Worker(path.join(__dirname, 'mqtt-worker.js'), {
                workerData: { workerId: i }
            });

            // 监听 Worker 消息
            worker.on('message', (msg) => {
                if (msg.type === 'log') {
                    // 防止 Worker 在停止后仍发送日志导致的竞态条件
                    if (this.logCallback && typeof this.logCallback === 'function') {
                        this.logCallback(msg.data);
                    }
                } else if (msg.type === 'ready') {
                    this.log(`[Worker ${msg.workerId}] 已就绪`, 'success');
                } else if (msg.type === 'stats') {
                    // 聚合 Worker 统计数据
                    this.statisticsCollector.mergeWorkerStats(msg.data);
                } else if (msg.type === 'device-online') {
                    // 更新在线设备数
                    const currentOnline = Math.max(0, this.statisticsCollector.stats.onlineDevices + msg.data.increment);
                    this.statisticsCollector.setOnlineDevices(currentOnline);
                }
            });

            worker.on('error', (err) => {
                if (this.logCallback && typeof this.logCallback === 'function') {
                    this.log(`[Worker ${i}] 错误: ${err.message}`, 'error');
                }
            });

            worker.on('exit', (code) => {
                if (code !== 0) {
                    this.log(`[Worker ${i}] 异常退出，代码: ${code}`, 'error');
                }
            });

            // 发送启动命令
            worker.postMessage({
                type: 'start',
                config: {
                    startIndex,
                    endIndex,
                    host: this.config.mqtt.host,
                    port: this.config.mqtt.port,
                    topic: this.config.mqtt.topic,
                    clientIdPrefix: this.config.client_id_prefix || this.config.username_prefix || 'device',
                    usernamePrefix: this.config.username_prefix || 'device',
                    passwordPrefix: this.config.password_prefix || 'device',
                    sendInterval: this.config.send_interval || 1,
                    format: this.config.data.format,
                    randomKeyCount,
                    customKeys: this.config.custom_keys || []
                }
            });

            this.workers.push(worker);
        }

        // 注意：Worker 模式下在线设备数将在 Worker 连接成功后逐步更新
        // 初始设置为 0，等待 Worker 报告
        this.statisticsCollector.setOnlineDevices(0);
    }

    startAdvancedMode() {
        this.log('[Controller] 启动高级模式...', 'info');

        // 重置统计数据
        this.statisticsCollector.reset();

        // 计算总设备数
        let totalDevices = 0;
        this.config.advanced.groups.forEach(group => {
            totalDevices += (group.end - group.start + 1);
        });
        this.statisticsCollector.setTotalDevices(totalDevices);

        this.config.advanced.groups.forEach(group => {
            const count = group.end - group.start + 1;
            // Calculate padding length based on the end number for this group
            // User requested fixed padding of 2
            const paddingLength = 2;

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

                this.createClient(i, mqttConfig, paddingLength, (client, clientId) => {
                    // 添加到已连接设备集合
                    if (!this.connectedDevices.has(clientId)) {
                        this.connectedDevices.add(clientId);
                        this.statisticsCollector.setOnlineDevices(this.connectedDevices.size);
                    }

                    // Calculate effective count for random keys
                    const customKeyCount = (group.customKeys && group.customKeys.length) || 0;
                    const randomKeyCount = Math.max(0, group.keyCount - customKeyCount);

                    let fullSendCount = 0; // Counter for full report sampling
                    let changeSendCount = 0; // Counter for change report sampling

                    // 1. 全量上报定时器
                    const fullIntervalId = setInterval(() => {
                        // Generate fresh data for random values
                        let data = generateTypedData(schema, randomKeyCount);

                        // Merge custom keys if defined
                        if (customKeyCount > 0) {
                            data = mergeCustomKeys(data, group.customKeys);
                        }

                        const jsonString = JSON.stringify(data);
                        const size = Buffer.byteLength(jsonString);
                        this.statisticsCollector.setGroupMessageSize(group.name, size);

                        client.publish(this.config.mqtt.topic, jsonString, (err) => {
                            if (err) {
                                this.log(`[${clientId}] 发送数据失败: ${err.message}`, 'error');
                                this.statisticsCollector.incrementFailure();
                            } else {
                                fullSendCount++;
                                this.statisticsCollector.incrementSuccess();
                                // Log sampling: only log every 10 successful full reports
                                if (fullSendCount % 10 === 1) {
                                    this.log(`[${clientId}] 全量上报成功 (已发送${fullSendCount}次)`, 'success');
                                }
                            }
                        });
                    }, group.fullInterval * 1000);
                    this.addInterval(clientId, fullIntervalId);

                    // 2. 变化上报定时器
                    // 注意：变化上报通常是基于总 Key 数量的比例，这里我们假设变化上报也包含自定义 Key
                    // 或者我们只对随机生成的 Key 进行变化上报？
                    // 用户需求是 "数据点数为 5 就最多定义 5 个 key"，这意味着总数控制。
                    // 对于变化上报，如果比例是 0.3，总数 10，那么应该上报 3 个 Key。
                    // 这 3 个 Key 可能包含自定义 Key，也可能不包含。
                    // 简单起见，我们先计算需要上报的总数，然后尝试混合。
                    // 但目前的实现是 generateTypedData 生成前 N 个，mergeCustomKeys 添加所有自定义 Key。
                    // 如果 mergeCustomKeys 总是添加所有自定义 Key，那么变化上报的数量可能会超过预期（如果自定义 Key 很多）。
                    // 不过通常变化上报是 "部分" 上报。
                    // 让我们保持简单：变化上报的数量 = floor(总数 * 比例)。
                    // 其中自定义 Key 全部上报（假设它们是重要的），剩余配额给随机 Key。

                    const totalChangeCount = Math.floor(group.keyCount * group.changeRatio);

                    if (totalChangeCount > 0) {
                        const changeIntervalId = setInterval(() => {
                            const randomChangeCount = Math.max(0, totalChangeCount - customKeyCount);

                            // Generate fresh data for random values
                            let data = generateTypedData(schema, randomChangeCount);

                            // Merge custom keys if defined
                            if (customKeyCount > 0) {
                                data = mergeCustomKeys(data, group.customKeys);
                            }

                            const jsonString = JSON.stringify(data);
                            // Note: Change report size might differ from full report, but we update the latest size
                            const size = Buffer.byteLength(jsonString);
                            this.statisticsCollector.setGroupMessageSize(group.name, size);

                            client.publish(this.config.mqtt.topic, jsonString, (err) => {
                                if (err) {
                                    this.log(`[${clientId}] 变化上报失败: ${err.message}`, 'error');
                                    this.statisticsCollector.incrementFailure();
                                } else {
                                    changeSendCount++;
                                    this.statisticsCollector.incrementSuccess();
                                    // Log sampling: only log every 10 successful change reports
                                    if (changeSendCount % 10 === 1) {
                                        this.log(`[${clientId}] 变化上报成功 (已发送${changeSendCount}次)`, 'success');
                                    }
                                }
                            });
                        }, group.changeInterval * 1000);
                        this.addInterval(clientId, changeIntervalId);
                    }
                });
            }
        });
    }

    createClient(deviceIndex, mqttConfig, paddingLength, onConnect) {
        // 使用各自独立的前缀
        const clientIdPrefix = mqttConfig.client_id_prefix || mqttConfig.username_prefix || 'device';
        const usernamePrefix = mqttConfig.username_prefix || 'device';
        const passwordPrefix = mqttConfig.password_prefix || 'device';

        // Pad the device index with zeros
        const indexStr = String(deviceIndex).padStart(paddingLength, '0');

        const clientId = `${clientIdPrefix}${indexStr}`;
        const username = `${usernamePrefix}${indexStr}`;
        const password = `${passwordPrefix}${indexStr}`;

        const options = {
            clientId,
            username,
            password,
            clean: true,
            connectTimeout: 30000,
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

            // 从已连接设备集合中移除
            if (this.connectedDevices.has(clientId)) {
                this.connectedDevices.delete(clientId);
                this.statisticsCollector.setOnlineDevices(this.connectedDevices.size);
            }
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

        // 清理模板缓存
        clearTemplateCache();

        if (typeof this.logCallback === 'function') {
            this.logCallback({ message: '[Controller] 正在停止所有模拟设备...', type: 'info', timestamp: new Date().toLocaleTimeString() });
        }

        // 停止所有 Worker
        if (this.workers.length > 0) {
            this.log('[Controller] 正在停止所有 Worker 线程...', 'info');
            this.workers.forEach((worker, index) => {
                try {
                    worker.postMessage({ type: 'stop' });
                    // 给Worker 500ms时间优雅关闭，然后强制终止
                    setTimeout(() => {
                        worker.terminate();
                    }, 500);
                } catch (e) {
                    console.error(`[Controller] 停止 Worker ${index} 错误: ${e.message}`);
                }
            });
            this.workers = [];
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

        // 清空已连接设备集合
        this.connectedDevices.clear();

        if (typeof this.logCallback === 'function') {
            this.logCallback({ message: '[Controller] 所有设备已停止，模拟结束。', type: 'info', timestamp: new Date().toLocaleTimeString() });
        }

        this.logCallback = null;
    }
}

module.exports = MqttController;