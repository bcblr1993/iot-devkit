/**
 * @fileoverview MQTT Worker Thread
 * 用于在独立线程中运行设备模拟，突破单进程瓶颈
 */

const { parentPort, workerData } = require('worker_threads');
const mqtt = require('mqtt');
const { getBasicTemplate, clearTemplateCache } = require('./data-generator');

// Worker 状态
let clients = [];
let intervals = new Map(); // Stores the current timeout ID for the loop
let staggerTimeouts = new Map(); // Stores the initial stagger timeout ID
let isRunning = false;

// Worker 统计数据
let workerStats = {
    successCount: 0,
    failureCount: 0,
    lastReportedSuccess: 0,
    lastReportedFailure: 0
};

/**
 * Format date to YYYY-MM-DD HH:mm:ss
 */
function formatDate(date) {
    const pad = (n) => String(n).padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    const ms = String(date.getMilliseconds()).padStart(3, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`;
}

/**
 * 向主线程发送日志
 */
function sendLog(message, type = 'info') {
    parentPort.postMessage({
        type: 'log',
        data: {
            message,
            type,
            timestamp: formatDate(new Date())
        }
    });
}

/**
 * 创建单个设备客户端
 */
function createClient(deviceIndex, config) {
    const paddingLength = 1; // Fixed 1-digit (no padding): c1, c2, c3...
    const indexStr = String(deviceIndex).padStart(paddingLength, '0');

    const clientId = `${config.clientIdPrefix}${indexStr}`;
    const username = `${config.usernamePrefix}${indexStr}`;
    const password = `${config.passwordPrefix}${indexStr}`;

    const options = {
        clientId,
        username,
        password,
        clean: true,
        connectTimeout: 30000,
        reconnectPeriod: 5000
    };

    const client = mqtt.connect(`mqtt://${config.host}:${config.port}`, options);
    clients.push(client);

    client.on('connect', () => {
        sendLog(`[${clientId}] 连接成功 (Worker ${workerData.workerId})`, 'success');

        // 报告设备上线
        parentPort.postMessage({
            type: 'device-online',
            data: { increment: 1 }
        });

        // 启动定时发送
        // 增加 0-1000ms 的随机延迟，防止 Worker 内部定时器拥塞
        const staggerDelay = Math.floor(Math.random() * 1000);

        const staggerId = setTimeout(() => {
            staggerTimeouts.delete(clientId);
            if (!isRunning) return; // Prevent zombie start if stopped during delay

            let sendCount = 0;
            const intervalMs = config.sendInterval * 1000;
            // Use alignedStartTime from config if available, fallback to now
            const baseTime = config.alignedStartTime || Date.now();
            let nextTargetTime = baseTime;

            // Recursive function for precise timing
            const scheduleNextTick = () => {
                if (!isRunning) return;

                // 1. Calculate consistent timestamp based on count
                const payloadTimestamp = baseTime + (sendCount * intervalMs);

                // 2. Check drift (Trigger warning if we are falling behind significantly)
                const now = Date.now();
                const drift = now - payloadTimestamp;
                if (drift > 2000) {
                    // Only log periodically to avoid spam
                    if (Math.random() < 0.01) {
                        sendLog(`[${clientId}] Lag warning: Running ${drift}ms behind schedule`, 'warning');
                    }
                }

                // 3. Generate Payload
                let payload;
                switch (config.format) {
                    case 'tn':
                        payload = require('./data-generator').generateTnPayload(config.randomKeyCount, payloadTimestamp);
                        break;
                    case 'tn-empty':
                        payload = require('./data-generator').generateTnEmptyPayload(0, payloadTimestamp);
                        break;
                    default:
                        payload = require('./data-generator').generateBatteryStatus(config.randomKeyCount, clientId, payloadTimestamp);
                        break;
                }

                // Merge custom keys if defined
                if (config.customKeys && config.customKeys.length > 0) {
                    payload = require('./data-generator').mergeCustomKeys(payload, config.customKeys);
                }

                const msg = JSON.stringify(payload);
                const size = Buffer.byteLength(msg);

                // 4. Publish
                client.publish(config.topic, msg, (err) => {
                    if (err) {
                        sendLog(`[${clientId}] 发送失败: ${err.message}`, 'error');
                        workerStats.failureCount++;
                    } else {
                        workerStats.successCount++;

                        // 每 100 条发送一次统计（批量上报）
                        if (workerStats.successCount - workerStats.lastReportedSuccess >= 100 ||
                            workerStats.failureCount - workerStats.lastReportedFailure >= 10) {
                            parentPort.postMessage({
                                type: 'stats',
                                data: {
                                    successCount: workerStats.successCount - workerStats.lastReportedSuccess,
                                    failureCount: workerStats.failureCount - workerStats.lastReportedFailure,
                                    messageSize: size
                                }
                            });
                            workerStats.lastReportedSuccess = workerStats.successCount;
                            workerStats.lastReportedFailure = workerStats.failureCount;
                        }

                        // 实时日志（不再采样）
                        sendLog(`[${clientId}] 已发送 ${sendCount} 条消息 (大小: ${size} Bytes, Lag: ${drift}ms)`, 'success');
                    }
                });

                // 5. Schedule Next
                sendCount++;
                nextTargetTime = baseTime + (sendCount * intervalMs); // Ideally strictly aligned

                // Calculate delay for next tick
                const delay = Math.max(0, nextTargetTime - Date.now());

                // Store timeout ID for cleanup
                const timeoutId = setTimeout(scheduleNextTick, delay);
                intervals.set(clientId, timeoutId);
            };

            // Start the loop
            // Calculate initial delay to reach the first target time
            // If baseTime is in future, wait. If in past (e.g. drift), start immediately.
            // But we start at count=0, so target is baseTime.
            nextTargetTime = baseTime;
            const initialDelay = Math.max(0, nextTargetTime - Date.now());
            const firstId = setTimeout(scheduleNextTick, initialDelay);
            intervals.set(clientId, firstId);

        }, staggerDelay);

        staggerTimeouts.set(clientId, staggerId);
    });

    client.on('error', (err) => {
        sendLog(`[${clientId}] 连接错误: ${err.message}`, 'error');
    });

    client.on('close', () => {
        sendLog(`[${clientId}] 连接关闭`, 'info');

        // 报告设备下线
        parentPort.postMessage({
            type: 'device-online',
            data: { increment: -1 }
        });

        if (intervals.has(clientId)) {
            clearTimeout(intervals.get(clientId)); // Use clearTimeout for setTimeout
            intervals.delete(clientId);
        }
        if (staggerTimeouts.has(clientId)) {
            clearTimeout(staggerTimeouts.get(clientId));
            staggerTimeouts.delete(clientId);
        }
    });
}

/**
 * 启动模拟
 */
function startSimulation(config) {
    if (isRunning) {
        sendLog('[Worker] 模拟已在运行中', 'error');
        return;
    }

    isRunning = true;
    sendLog(`[Worker ${workerData.workerId}] 启动模拟，设备范围: [${config.startIndex} - ${config.endIndex}]`, 'info');

    for (let i = config.startIndex; i <= config.endIndex; i++) {
        createClient(i, config);
    }
}

/**
 * 停止模拟
 */
function stopSimulation() {
    if (!isRunning) {
        return;
    }

    isRunning = false;
    sendLog(`[Worker ${workerData.workerId}] 正在停止...`, 'info');

    // 清理所有定时器
    for (const [clientId, timeoutId] of intervals.entries()) {
        clearTimeout(timeoutId);
    }
    intervals.clear();

    for (const [clientId, timeoutId] of staggerTimeouts.entries()) {
        clearTimeout(timeoutId);
    }
    staggerTimeouts.clear();

    // 关闭所有客户端
    clients.forEach(client => {
        try {
            client.end(true);
            client.removeAllListeners();
        } catch (e) {
            console.error(`[Worker] 关闭客户端错误: ${e.message}`);
        }
    });
    clients = [];

    // 清理模板缓存
    clearTemplateCache();

    sendLog(`[Worker ${workerData.workerId}] 已停止`, 'info');
}

// 监听主线程消息
parentPort.on('message', (msg) => {
    switch (msg.type) {
        case 'start':
            startSimulation(msg.config);
            break;
        case 'stop':
            stopSimulation();
            break;
        default:
            console.error(`[Worker] 未知消息类型: ${msg.type}`);
    }
});

// 通知主线程 Worker 已就绪
parentPort.postMessage({ type: 'ready', workerId: workerData.workerId });
