// 当DOM加载完毕后执行
document.addEventListener('DOMContentLoaded', () => {
    // 获取所有UI元素的引用
    const hostInput = document.getElementById('host');
    const portInput = document.getElementById('port');
    const topicInput = document.getElementById('topic');
    const deviceStartNumberInput = document.getElementById('device_start_number');
    const deviceEndNumberInput = document.getElementById('device_end_number');
    const usernamePrefixInput = document.getElementById('username_prefix');
    const passwordPrefixInput = document.getElementById('password_prefix');
    const sendIntervalInput = document.getElementById('send_interval');
    const formatSelect = document.getElementById('format');
    const dataPointCountInput = document.getElementById('data_point_count');
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    const logContainer = document.getElementById('log-container');
    const clearBtn = document.getElementById('clear-btn');

    // 1. 应用启动时，从主进程获取初始配置并填充UI
    window.api.getInitialConfig().then(config => {
        hostInput.value = config.mqtt.host;
        portInput.value = config.mqtt.port;
        topicInput.value = config.mqtt.topic;
        // 【修复】使用正确的字段并移除未定义的 deviceCountInput
        // 兼容旧配置：如果只有 device_count，则默认从1开始
        deviceStartNumberInput.value = config.mqtt.device_start_number !== undefined ? config.mqtt.device_start_number : 1;
        deviceEndNumberInput.value = config.mqtt.device_end_number !== undefined ? config.mqtt.device_end_number : (config.mqtt.device_count || 10);
        usernamePrefixInput.value = config.mqtt.username_prefix;
        passwordPrefixInput.value = config.mqtt.password_prefix;
        sendIntervalInput.value = config.mqtt.send_interval;
        formatSelect.value = config.data.format;
        dataPointCountInput.value = config.data.data_point_count;
    });

    // 2. 为“启动”按钮添加点击事件监听器
    startBtn.addEventListener('click', () => {
        // 从UI收集当前配置
        const config = {
            host: hostInput.value,
            port: parseInt(portInput.value, 10),
            topic: topicInput.value,
            device_start_number: parseInt(deviceStartNumberInput.value, 10),
            device_end_number: parseInt(deviceEndNumberInput.value, 10),
            username_prefix: usernamePrefixInput.value,
            password_prefix: passwordPrefixInput.value,
            send_interval: parseInt(sendIntervalInput.value, 10),
            format: formatSelect.value,
            data_point_count: parseInt(dataPointCountInput.value, 10)
        };
        // 通过预加载脚本的API，请求主进程启动模拟
        window.api.startSimulation(config);
        addLogEntry({ message: '启动命令已发送...', type: 'info', timestamp: new Date().toLocaleTimeString() });
    });

    // 3. 为“停止”按钮添加点击事件监听器
    stopBtn.addEventListener('click', () => {
        // 请求主进程停止模拟
        window.api.stopSimulation();
    });

    // 4. 为“清空”按钮添加点击事件监听器
    clearBtn.addEventListener('click', () => {
        logContainer.innerHTML = '';
    });

    // 5. 监听从主进程发来的日志更新
    window.api.onLogUpdate((logObj) => {
        // 兼容旧版本：如果是字符串，封装成对象
        if (typeof logObj === 'string') {
            logObj = { message: logObj, type: 'info', timestamp: new Date().toLocaleTimeString() };
        }
        addLogEntry(logObj);
    });

    /**
     * 向日志容器添加一条新日志
     * @param {object} log - { message, type, timestamp }
     */
    function addLogEntry(log) {
        const entryDiv = document.createElement('div');
        entryDiv.className = 'log-entry';

        const timeSpan = document.createElement('span');
        timeSpan.className = 'log-timestamp';
        timeSpan.textContent = `[${log.timestamp}]`;

        const msgSpan = document.createElement('span');
        // 根据类型添加对应的样式类
        switch (log.type) {
            case 'success':
                msgSpan.className = 'log-success';
                break;
            case 'error':
                msgSpan.className = 'log-error';
                break;
            case 'data':
                msgSpan.className = 'log-data';
                break;
            default:
                msgSpan.className = 'log-info';
        }
        msgSpan.textContent = log.message;

        entryDiv.appendChild(timeSpan);
        entryDiv.appendChild(msgSpan);

        logContainer.appendChild(entryDiv);

        // 自动滚动到底部
        logContainer.scrollTop = logContainer.scrollHeight;
    }
});