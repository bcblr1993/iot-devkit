document.addEventListener('DOMContentLoaded', () => {
    // Basic Mode Elements
    const hostInput = document.getElementById('host');
    const portInput = document.getElementById('port');
    const topicInput = document.getElementById('topic');
    const deviceStartNumberInput = document.getElementById('device_start_number');
    const deviceEndNumberInput = document.getElementById('device_end_number');
    const devicePrefixInput = document.getElementById('device_prefix');
    const clientIdPrefixInput = document.getElementById('client_id_prefix');
    const usernamePrefixInput = document.getElementById('username_prefix');
    const passwordPrefixInput = document.getElementById('password_prefix');
    const sendIntervalInput = document.getElementById('send_interval');
    const formatSelect = document.getElementById('format');
    const dataPointCountInput = document.getElementById('data_point_count');

    // Common Elements
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    const logContainer = document.getElementById('log-container');
    const clearBtn = document.getElementById('clear-btn');

    // Advanced Mode Elements
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const addGroupBtn = document.getElementById('add-group-btn');
    const groupsContainer = document.getElementById('groups-container');

    // Custom Keys Elements
    const addCustomKeyBasicBtn = document.getElementById('add-custom-key-basic');
    const customKeysBasicContainer = document.getElementById('custom-keys-basic-container');

    let currentMode = 'basic';
    let groups = [];
    let customKeysBasic = []; // Store custom keys for basic mode

    // --- Initialization ---

    // 1. Get Initial Config
    window.api.getInitialConfig().then(config => {
        // Fill Basic Config
        hostInput.value = config.mqtt.host;
        portInput.value = config.mqtt.port;
        topicInput.value = config.mqtt.topic;
        deviceStartNumberInput.value = config.mqtt.device_start_number !== undefined ? config.mqtt.device_start_number : 1;
        deviceEndNumberInput.value = config.mqtt.device_end_number !== undefined ? config.mqtt.device_end_number : (config.mqtt.device_count || 10);

        // New prefix fields with backward compatibility
        devicePrefixInput.value = config.mqtt.device_prefix || 'c';
        clientIdPrefixInput.value = config.mqtt.client_id_prefix || config.mqtt.username_prefix || 'c';
        usernamePrefixInput.value = config.mqtt.username_prefix || 'c';
        passwordPrefixInput.value = config.mqtt.password_prefix || 'c';

        sendIntervalInput.value = config.mqtt.send_interval;
        formatSelect.value = config.data.format;
        dataPointCountInput.value = config.data.data_point_count;

        // Initialize with one default group if empty
        if (groups.length === 0) {
            addGroup();
        }
    });

    // Initialize button states
    stopBtn.disabled = true;

    // --- Event Listeners ---

    // Tab Switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update Tab UI
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update Content UI
            const tabName = btn.dataset.tab;
            tabContents.forEach(c => c.classList.remove('active'));
            document.getElementById(`${tabName}-panel`).classList.add('active');

            currentMode = tabName;
        });
    });

    // Add Group
    addGroupBtn.addEventListener('click', () => {
        addGroup();
    });

    // Add Custom Key (Basic Mode)
    addCustomKeyBasicBtn.addEventListener('click', () => {
        addCustomKeyBasic();
    });

    // Start Simulation
    startBtn.addEventListener('click', () => {
        const config = {
            mode: currentMode,
            // Root level for basic mode
            device_start_number: parseInt(deviceStartNumberInput.value, 10),
            device_end_number: parseInt(deviceEndNumberInput.value, 10),
            device_prefix: devicePrefixInput.value,
            client_id_prefix: clientIdPrefixInput.value,
            username_prefix: usernamePrefixInput.value,
            password_prefix: passwordPrefixInput.value,
            send_interval: parseInt(sendIntervalInput.value, 10),
            format: formatSelect.value,
            data_point_count: parseInt(dataPointCountInput.value, 10),
            custom_keys: collectCustomKeysBasic(), // Add custom keys
            // MQTT connection settings
            mqtt: {
                host: hostInput.value,
                port: parseInt(portInput.value, 10),
                topic: topicInput.value,
                device_prefix: devicePrefixInput.value,
                client_id_prefix: clientIdPrefixInput.value,
                username_prefix: usernamePrefixInput.value,
                password_prefix: passwordPrefixInput.value,
            },
            data: {
                format: formatSelect.value,
                data_point_count: parseInt(dataPointCountInput.value, 10)
            },
            advanced: {
                groups: collectGroupsData()
            }
        };

        window.api.startSimulation(config);
        addLogEntry({ message: `启动命令已发送 (模式: ${currentMode === 'basic' ? '基础' : '高级'})...`, type: 'info', timestamp: new Date().toLocaleTimeString() });

        // Update button states
        startBtn.disabled = true;
        stopBtn.disabled = false;
    });

    // Stop Simulation
    stopBtn.addEventListener('click', () => {
        window.api.stopSimulation();

        // Update button states
        startBtn.disabled = false;
        stopBtn.disabled = true;
    });

    // Clear Logs
    clearBtn.addEventListener('click', () => {
        logContainer.innerHTML = '';
    });

    // Log Update
    window.api.onLogUpdate((logObj) => {
        if (typeof logObj === 'string') {
            logObj = { message: logObj, type: 'info', timestamp: new Date().toLocaleTimeString() };
        }
        addLogEntry(logObj);
    });

    // --- Helper Functions ---

    function addGroup() {
        const id = Date.now();
        const groupHtml = `
            <div class="group-item" id="group-${id}">
                <div class="group-header">
                    <span>分组 #${groupsContainer.children.length + 1}</span>
                    <button class="delete-group-btn" onclick="document.getElementById('group-${id}').remove()">删除</button>
                </div>
                <div class="group-form">
                    <div>
                        <label>分组名称</label>
                        <input type="text" class="group-name" value="Group ${String.fromCharCode(65 + groupsContainer.children.length)}">
                    </div>
                    <div>
                        <label>Key 数量</label>
                        <input type="number" class="group-key-count" value="10">
                    </div>
                    <div>
                        <label>起始 ID</label>
                        <input type="number" class="group-start" value="10">
                    </div>
                    <div>
                        <label>结束 ID</label>
                        <input type="number" class="group-end" value="20">
                    </div>
                    
                    <!-- New Credential Prefixes -->
                    <div>
                        <label>设备名称前缀</label>
                        <input type="text" class="group-device-prefix" value="devices-">
                    </div>
                    <div>
                        <label>Client ID 前缀</label>
                        <input type="text" class="group-client-id-prefix" value="devices-">
                    </div>
                    <div>
                        <label>用户名前缀</label>
                        <input type="text" class="group-username-prefix" value="devices-">
                    </div>
                    <div>
                        <label>密码前缀</label>
                        <input type="text" class="group-password-prefix" value="devices-">
                    </div>
                    <!-- End New Credential Prefixes -->

                    <div>
                        <label>全量上报间隔 (秒)</label>
                        <input type="number" class="group-full-interval" value="300">
                    </div>
                    <div>
                        <label>变化上报间隔 (秒)</label>
                        <input type="number" class="group-change-interval" value="1">
                    </div>
                    <div>
                        <label>变化比例 (0-1)</label>
                        <input type="number" class="group-change-ratio" value="0.3" step="0.1" max="1" min="0">
                    </div>
                    
                    <div class="ratio-input">
                        <label>浮点占比</label>
                        <input type="number" class="ratio-float" value="0.25" step="0.01">
                    </div>
                    <div class="ratio-input">
                        <label>整数占比</label>
                        <input type="number" class="ratio-int" value="0.25" step="0.01">
                    </div>
                    <div class="ratio-input">
                        <label>字符串占比</label>
                        <input type="number" class="ratio-string" value="0.25" step="0.01">
                    </div>
                    <div class="ratio-input">
                        <label>布尔占比</label>
                        <input type="number" class="ratio-bool" value="0.25" step="0.01">
                    </div>
                    
                    <!-- Custom Keys for this group -->
                    <div class="group-custom-keys" style="grid-column: 1 / -1;">
                        <div class="section-header">
                            <h4>📌 自定义 Key</h4>
                            <button type="button" class="btn-add-small" onclick="addCustomKeyToGroup(${id})">+ 添加</button>
                        </div>
                        <div class="custom-keys-container" id="group-custom-keys-${id}">
                            <!-- Custom keys for this group -->
                        </div>
                    </div>
                </div>
            </div>
        `;
        groupsContainer.insertAdjacentHTML('beforeend', groupHtml);
    }

    function collectGroupsData() {
        const groupElements = document.querySelectorAll('.group-item');
        const groupsData = [];

        groupElements.forEach(el => {
            const groupId = el.id.replace('group-', '');

            // Collect custom keys for this group
            const customKeysContainer = el.querySelector(`#group-custom-keys-${groupId}`);
            const customKeys = [];

            if (customKeysContainer) {
                const keyElements = customKeysContainer.querySelectorAll('.custom-key-item');
                keyElements.forEach(keyEl => {
                    const name = keyEl.querySelector('.key-name').value;
                    const type = keyEl.querySelector('.key-type').value;

                    if (name) {
                        const keyDef = { name, type };

                        if (type === 'int' || type === 'float') {
                            keyDef.min = parseFloat(keyEl.querySelector('.key-min').value);
                            keyDef.max = parseFloat(keyEl.querySelector('.key-max').value);
                        }

                        customKeys.push(keyDef);
                    }
                });
            }

            groupsData.push({
                name: el.querySelector('.group-name').value,
                keyCount: parseInt(el.querySelector('.group-key-count').value, 10),
                start: parseInt(el.querySelector('.group-start').value, 10),
                end: parseInt(el.querySelector('.group-end').value, 10),
                // New Fields
                devicePrefix: el.querySelector('.group-device-prefix').value,
                clientIdPrefix: el.querySelector('.group-client-id-prefix').value,
                usernamePrefix: el.querySelector('.group-username-prefix').value,
                passwordPrefix: el.querySelector('.group-password-prefix').value,
                // End New Fields
                fullInterval: parseInt(el.querySelector('.group-full-interval').value, 10),
                changeInterval: parseInt(el.querySelector('.group-change-interval').value, 10),
                changeRatio: parseFloat(el.querySelector('.group-change-ratio').value),
                typeRatio: {
                    float: parseFloat(el.querySelector('.ratio-float').value),
                    int: parseFloat(el.querySelector('.ratio-int').value),
                    string: parseFloat(el.querySelector('.ratio-string').value),
                    bool: parseFloat(el.querySelector('.ratio-bool').value)
                },
                customKeys: customKeys // Add custom keys to group data
            });
        });

        return groupsData;
    }

    function addLogEntry(log) {
        const entryDiv = document.createElement('div');
        entryDiv.className = 'log-entry';

        const timeSpan = document.createElement('span');
        timeSpan.className = 'log-timestamp';
        timeSpan.textContent = `[${log.timestamp}]`;

        const msgSpan = document.createElement('span');
        switch (log.type) {
            case 'success': msgSpan.className = 'log-success'; break;
            case 'error': msgSpan.className = 'log-error'; break;
            case 'data': msgSpan.className = 'log-data'; break;
            default: msgSpan.className = 'log-info';
        }
        msgSpan.textContent = log.message;

        entryDiv.appendChild(timeSpan);
        entryDiv.appendChild(msgSpan);

        logContainer.appendChild(entryDiv);
        logContainer.scrollTop = logContainer.scrollHeight;
    }

    // ===== Custom Keys Functions =====
    function addCustomKeyBasic() {
        const id = Date.now();
        const keyHtml = `
            <div class="custom-key-item" id="custom-key-basic-${id}">
                <div>
                    <label>Key 名称</label>
                    <input type="text" class="key-name" placeholder="例如: temperature">
                </div>
                <div>
                    <label>类型</label>
                    <select class="key-type" onchange="toggleRangeInputs(this, ${id}, 'basic')">
                        <option value="int">整数</option>
                        <option value="float">浮点</option>
                        <option value="string">字符串</option>
                        <option value="bool">布尔</option>
                    </select>
                </div>
                <div class="range-input">
                    <label>最小值</label>
                    <input type="number" class="key-min" value="0" step="0.01">
                </div>
                <div class="range-input">
                    <label>最大值</label>
                    <input type="number" class="key-max" value="100" step="0.01">
                </div>
                <button type="button" class="btn-remove-key" onclick="document.getElementById('custom-key-basic-${id}').remove()">删除</button>
            </div>
        `;
        customKeysBasicContainer.insertAdjacentHTML('beforeend', keyHtml);
    }

    function collectCustomKeysBasic() {
        const keyElements = customKeysBasicContainer.querySelectorAll('.custom-key-item');
        const keys = [];

        keyElements.forEach(el => {
            const name = el.querySelector('.key-name').value;
            const type = el.querySelector('.key-type').value;

            if (name) {
                const keyDef = { name, type };

                if (type === 'int' || type === 'float') {
                    keyDef.min = parseFloat(el.querySelector('.key-min').value);
                    keyDef.max = parseFloat(el.querySelector('.key-max').value);
                } else if (type === 'string') {
                    keyDef.value = el.querySelector('.key-name').value;
                }

                keys.push(keyDef);
            }
        });

        return keys;
    }

    // Make toggleRangeInputs global so it can be called from HTML
    window.toggleRangeInputs = function (selectElement, id, mode) {
        const container = document.getElementById(`custom-key-${mode}-${id}`);
        const rangeInputs = container.querySelectorAll('.range-input');
        const type = selectElement.value;

        rangeInputs.forEach(input => {
            if (type === 'int' || type === 'float') {
                input.style.display = 'block';
            } else {
                input.style.display = 'none';
            }
        });
    };

    // Add custom key to a specific group
    window.addCustomKeyToGroup = function (groupId) {
        const keyId = Date.now();
        const container = document.getElementById(`group-custom-keys-${groupId}`);

        const keyHtml = `
            <div class="custom-key-item" id="custom-key-group-${groupId}-${keyId}">
                <div>
                    <label>Key 名称</label>
                    <input type="text" class="key-name" placeholder="例如: temperature">
                </div>
                <div>
                    <label>类型</label>
                    <select class="key-type" onchange="toggleGroupKeyRangeInputs(this, ${groupId}, ${keyId})">
                        <option value="int">整数</option>
                        <option value="float">浮点</option>
                        <option value="string">字符串</option>
                        <option value="bool">布尔</option>
                    </select>
                </div>
                <div class="range-input">
                    <label>最小值</label>
                    <input type="number" class="key-min" value="0" step="0.01">
                </div>
                <div class="range-input">
                    <label>最大值</label>
                    <input type="number" class="key-max" value="100" step="0.01">
                </div>
                <button type="button" class="btn-remove-key" onclick="document.getElementById('custom-key-group-${groupId}-${keyId}').remove()">删除</button>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', keyHtml);
    };

    window.toggleGroupKeyRangeInputs = function (selectElement, groupId, keyId) {
        const container = document.getElementById(`custom-key-group-${groupId}-${keyId}`);
        const rangeInputs = container.querySelectorAll('.range-input');
        const type = selectElement.value;

        rangeInputs.forEach(input => {
            if (type === 'int' || type === 'float') {
                input.style.display = 'flex';
            } else {
                input.style.display = 'none';
            }
        });
    };
});