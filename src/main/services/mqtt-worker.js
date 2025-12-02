/**
 * @fileoverview MQTT Worker Thread
 * 用于在独立线程中运行设备模拟，突破单进程瓶颈
 */

const { parentPort, workerData } = require('worker_threads');
const mqtt = require('mqtt');
const { getBasicTemplate, clearTemplateCache } = require('./data-generator');

// Worker 状态
let clients = [];
let intervals = new Map();
let isRunning = false;

// Worker 统计数据
let workerStats = {
    successCount: 0,
    failureCount: 0,
    lastReportedSuccess: 0,
    lastReportedFailure: 0
};

/**
 * 向主线程发送日志
 */
function sendLog(message, type = 'info') {
    parentPort.postMessage({
        type: 'log',
        data: {
            message,
            type,
            timestamp: new Date().toLocaleTimeString()
        }
    });
}

/**
 * 创建单个设备客户端
 */
function createClient(deviceIndex, config) {
    const paddingLength = 2; // 固定2位填充
    const indexStr = String(deviceIndex).padStart(paddingLength, '0');

    const clientId = `${config.clientIdPrefix}${indexStr}`;
    const username = `${config.usernamePrefix}${indexStr}`;
    const password = `${config.passwordPrefix}${indexStr}`;

    const options = {
        clientId,
        username,
        password,
        clean: true,
        connectTimeout: 4000,
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
        let sendCount = 0;
        const intervalId = setInterval(() => {
            // 使用缓存模板
            const msg = getBasicTemplate(
                config.randomKeyCount,
                config.format,
                config.customKeys || []
            );

            client.publish(config.topic, msg, (err) => {
                if (err) {
                    sendLog(`[${clientId}] 发送失败: ${err.message}`, 'error');
                    workerStats.failureCount++;
                } else {
                    sendCount++;
                    workerStats.successCount++;

                    // 每 100 条发送一次统计（批量上报）
                    if (workerStats.successCount - workerStats.lastReportedSuccess >= 100 ||
                        workerStats.failureCount - workerStats.lastReportedFailure >= 10) {
                        parentPort.postMessage({
                            type: 'stats',
                            data: {
                                successCount: workerStats.successCount - workerStats.lastReportedSuccess,
                                failureCount: workerStats.failureCount - workerStats.lastReportedFailure
                            }
                        });
                        workerStats.lastReportedSuccess = workerStats.successCount;
                        workerStats.lastReportedFailure = workerStats.failureCount;
                    }

                    // 日志采样
                    if (sendCount % 10 === 1) {
                        sendLog(`[${clientId}] 已发送 ${sendCount} 条消息`, 'success');
                    }
                }
            });
        }, config.sendInterval * 1000);

        intervals.set(clientId, intervalId);
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
            clearInterval(intervals.get(clientId));
            intervals.delete(clientId);
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
    for (const [clientId, intervalId] of intervals.entries()) {
        clearInterval(intervalId);
    }
    intervals.clear();

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
