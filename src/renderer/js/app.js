/**
 * @fileoverview Main Application Entry Point - 应用主入口
 */

import { getElement } from './utils/dom-helpers.js';
import { LoggerUI } from './ui/logger-ui.js';
import { TabManager } from './ui/tabs.js';
import { GroupManager } from './ui/groups.js';
import { CustomKeyManager } from './ui/custom-keys.js';
import { ConfigService } from './services/config-service.js';
import StatisticsUI from './ui/statistics-ui.js';
import { TimestampTool } from './ui/timestamp-tool.js';
import { ThemeManager } from './ui/theme-manager.js';
import { JsonFormatterUI } from './ui/json-formatter.js';

class App {
    constructor() {
        this.isRunning = false;
        this.initializeComponents();
        this.setupEventListeners();
        this.loadInitialConfig();
    }

    initializeComponents() {
        // Initialize UI components
        this.logger = new LoggerUI();
        this.statistics = new StatisticsUI();
        // Use arrow function to preserve 'this' context
        this.tabManager = new TabManager(() => {
            // This callback is optional, mode changes are handled via events
        });
        this.groupManager = new GroupManager();
        this.customKeyManager = new CustomKeyManager();
        this.configService = new ConfigService(this.tabManager, this.groupManager, this.customKeyManager);

        // Initialize tools
        this.timestampTool = new TimestampTool();
        this.jsonFormatter = new JsonFormatterUI();

        this.currentPanel = 'simulator'; // 当前激活的面板

        // Initialize theme manager
        this.themeManager = new ThemeManager();

        // Expose customKeyManager for inline event handlers
        window.customKeyManager = this.customKeyManager;

        // Get DOM elements
        this.startBtn = getElement('start-btn');
        this.stopBtn = getElement('stop-btn');
        this.clearBtn = getElement('clear-btn');
        this.exportBtn = getElement('export-config-btn');
        this.importBtn = getElement('import-config-btn');
        this.addCustomKeyBasicBtn = getElement('add-custom-key-basic');

        // Initialize button states
        if (this.stopBtn) this.stopBtn.disabled = true;
    }

    setupEventListeners() {
        // Start/Stop buttons
        if (this.startBtn) {
            this.startBtn.addEventListener('click', () => this.handleStart());
        }
        if (this.stopBtn) {
            this.stopBtn.addEventListener('click', () => this.handleStop());
        }

        // Clear logs
        if (this.clearBtn) {
            this.clearBtn.addEventListener('click', () => this.logger.clear());
        }

        // Export/Import config
        if (this.exportBtn) {
            this.exportBtn.addEventListener('click', () => this.handleExport());
        }
        if (this.importBtn) {
            this.importBtn.addEventListener('click', () => this.handleImport());
        }

        // Add custom key (basic mode)
        if (this.addCustomKeyBasicBtn) {
            this.addCustomKeyBasicBtn.addEventListener('click', () => {
                this.customKeyManager.addKeyToBasic();
            });
        }

        // Mode change confirmation
        document.addEventListener('mode-change-request', (e) => {
            this.handleModeChangeRequest(e.detail);
        });

        // Log section toggle (collapse/expand)
        const logHeaderToggle = document.getElementById('log-header-toggle');
        if (logHeaderToggle) {
            logHeaderToggle.addEventListener('click', () => {
                const logSection = document.getElementById('log-section');
                if (logSection) {
                    logSection.classList.toggle('collapsed');
                }
            });
        }

        // Listen to MQTT logs from main process (batched for performance)
        window.api.onLogBatch((logs) => {
            logs.forEach(logObj => {
                this.logger.addEntry(logObj);
            });
        });

        // Listen to statistics updates
        window.api.onStatistics((stats) => {
            this.statistics.update(stats);
        });

        // Setup main navigation panel switching
        this.setupPanelSwitching();

        // Restore last active panel
        this.restoreActivePanel();
    }

    /**
     * Restore the last active panel from local storage
     */
    restoreActivePanel() {
        const lastPanel = localStorage.getItem('active-panel');
        if (lastPanel && lastPanel !== 'simulator') {
            this.switchPanel(lastPanel);
        }
    }

    async loadInitialConfig() {
        try {
            const config = await window.api.getInitialConfig();

            // 检查是否是保存的配置格式（包含 mode 字段）
            const isSavedConfig = config.mode !== undefined;

            if (isSavedConfig) {
                // 从保存的配置恢复
                this.restoreSavedConfig(config);
            } else {
                // 使用默认配置格式
                this.setElementValue('host', config.mqtt.host);
                this.setElementValue('port', config.mqtt.port);
                this.setElementValue('topic', config.mqtt.topic);
                this.setElementValue('device_start_number', config.mqtt.device_start_number !== undefined ? config.mqtt.device_start_number : 1);
                this.setElementValue('device_end_number', config.mqtt.device_end_number !== undefined ? config.mqtt.device_end_number : (config.mqtt.device_count || 10));
                this.setElementValue('device_prefix', config.mqtt.device_prefix || 'c');
                this.setElementValue('client_id_prefix', config.mqtt.client_id_prefix || config.mqtt.username_prefix || 'c');
                this.setElementValue('username_prefix', config.mqtt.username_prefix || 'c');
                this.setElementValue('password_prefix', config.mqtt.password_prefix || 'c');
                this.setElementValue('send_interval', config.mqtt.send_interval);
                this.setElementValue('format', config.data.format);
                this.setElementValue('data_point_count', config.data.data_point_count);

                // Initialize with one default group if empty
                const groupsContainer = getElement('groups-container');
                if (groupsContainer && groupsContainer.children.length === 0) {
                    this.groupManager.addGroup();
                }
            }
        } catch (error) {
            console.error('Failed to load initial config:', error);
        }
    }

    /**
     * 从保存的配置恢复 UI 状态
     */
    restoreSavedConfig(config) {
        // 恢复 MQTT 基础配置
        this.setElementValue('host', config.mqtt?.host || 'localhost');
        this.setElementValue('port', config.mqtt?.port || 1883);
        this.setElementValue('topic', config.mqtt?.topic || 'v1/devices/me/telemetry');

        // 恢复基础模式配置
        this.setElementValue('device_start_number', config.device_start_number || 1);
        this.setElementValue('device_end_number', config.device_end_number || 10);
        this.setElementValue('device_prefix', config.device_prefix || 'c');
        this.setElementValue('client_id_prefix', config.client_id_prefix || 'c');
        this.setElementValue('username_prefix', config.username_prefix || 'c');
        this.setElementValue('password_prefix', config.password_prefix || 'c');
        this.setElementValue('send_interval', config.send_interval || 1);
        this.setElementValue('format', config.data?.format || 'default');
        this.setElementValue('data_point_count', config.data?.data_point_count || 10);

        // 根据保存的模式切换到对应的 Tab
        if (config.mode === 'advanced' && config.advanced?.groups) {
            // 切换到高级模式
            this.tabManager.switchTab('advanced');

            // 恢复分组配置
            this.restoreAdvancedGroups(config.advanced.groups);
        } else {
            // 基础模式 - 恢复自定义 Keys
            if (config.custom_keys && config.custom_keys.length > 0) {
                this.restoreBasicCustomKeys(config.custom_keys);
            }
        }

        console.log('[App] 已恢复上次保存的配置');
    }

    /**
     * 恢复高级模式分组配置
     */
    restoreAdvancedGroups(groups) {
        // 清空现有分组
        const container = getElement('groups-container');
        if (container) {
            container.innerHTML = '';
        }

        // 逐个添加分组（这里只添加基础分组，自定义 Key 暂不恢复）
        groups.forEach((group, index) => {
            this.groupManager.addGroup();

            // 获取刚添加的分组元素
            const groupElements = document.querySelectorAll('.group-item');
            const groupEl = groupElements[groupElements.length - 1];

            if (groupEl) {
                // 恢复分组配置
                const nameInput = groupEl.querySelector('.group-name');
                const startInput = groupEl.querySelector('.group-start');
                const endInput = groupEl.querySelector('.group-end');
                const keyCountInput = groupEl.querySelector('.group-key-count');
                const devicePrefixInput = groupEl.querySelector('.group-device-prefix');
                const clientIdPrefixInput = groupEl.querySelector('.group-client-id-prefix');
                const usernamePrefixInput = groupEl.querySelector('.group-username-prefix');
                const passwordPrefixInput = groupEl.querySelector('.group-password-prefix');
                const fullIntervalInput = groupEl.querySelector('.group-full-interval');
                const changeIntervalInput = groupEl.querySelector('.group-change-interval');
                const changeRatioInput = groupEl.querySelector('.group-change-ratio');

                if (nameInput) nameInput.value = group.name || `Group ${String.fromCharCode(65 + index)}`;
                if (startInput) startInput.value = group.start || 1;
                if (endInput) endInput.value = group.end || 10;
                if (keyCountInput) keyCountInput.value = group.keyCount || 10;
                if (devicePrefixInput) devicePrefixInput.value = group.devicePrefix || 'devices-';
                if (clientIdPrefixInput) clientIdPrefixInput.value = group.clientIdPrefix || 'devices-';
                if (usernamePrefixInput) usernamePrefixInput.value = group.usernamePrefix || 'devices-';
                if (passwordPrefixInput) passwordPrefixInput.value = group.passwordPrefix || 'devices-';
                if (fullIntervalInput) fullIntervalInput.value = group.fullInterval || 300;
                if (changeIntervalInput) changeIntervalInput.value = group.changeInterval || 1;
                if (changeRatioInput) changeRatioInput.value = group.changeRatio || 0.3;
            }
        });
    }

    /**
     * 恢复基础模式自定义 Keys（简化版，不恢复复杂的自定义 Key）
     */
    restoreBasicCustomKeys(customKeys) {
        // 简化实现：只打印提示，不实际恢复
        // 因为自定义 Key 涉及动态 DOM 操作，完整恢复较复杂
        console.log('[App] 基础模式自定义 Keys 数量:', customKeys.length);
    }

    setElementValue(id, value) {
        const el = getElement(id);
        if (el && value !== undefined) {
            el.value = value;
        }
    }

    handleModeChangeRequest(detail) {
        const { from, to, onConfirm } = detail;

        // If simulation is running, ask for confirmation
        if (this.isRunning) {
            const confirmed = confirm('切换模式将停止当前正在运行的数据上送。\n\n是否确认切换？');
            if (!confirmed) {
                return; // User canceled
            }

            // User confirmed, stop simulation
            window.api.stopSimulation();
            this.isRunning = false;
            this.startBtn.disabled = false;
            this.stopBtn.disabled = true;

            this.logger.addEntry({
                message: '模拟已停止（用户切换模式）',
                type: 'info',
                timestamp: new Date().toLocaleTimeString()
            });
        }

        // Execute the switch
        if (onConfirm) {
            onConfirm();
        }
    }

    handleStart() {
        const mode = this.tabManager.getCurrentMode();
        const config = this.collectConfig(mode);

        // Validation: Custom Key Count < Total Data Points
        if (mode === 'basic') {
            const customKeyCount = config.custom_keys ? config.custom_keys.length : 0;
            const totalPoints = config.data.data_point_count;
            if (customKeyCount >= totalPoints) {
                alert(`错误: 自定义 Key 数量 (${customKeyCount}) 必须小于数据点总数 (${totalPoints})！\n请增加数据点数或减少自定义 Key。`);
                return;
            }
        } else {
            // Advanced mode validation
            for (const group of config.advanced.groups) {
                const customKeyCount = group.customKeys ? group.customKeys.length : 0;
                const totalPoints = group.keyCount;
                if (customKeyCount >= totalPoints) {
                    alert(`错误 (分组: ${group.name}): 自定义 Key 数量 (${customKeyCount}) 必须小于单个设备总点数 (${totalPoints})！\n请调整该分组配置。`);
                    return;
                }
            }
        }

        window.api.startSimulation(config);
        this.logger.addEntry({
            message: `启动命令已发送 (模式: ${mode === 'basic' ? '基础' : '高级'})...`,
            type: 'info',
            timestamp: new Date().toLocaleTimeString()
        });

        // Update button states
        this.isRunning = true;
        this.startBtn.disabled = true;
        this.stopBtn.disabled = false;

        // Lock configuration panel
        this.lockConfigPanel();
    }

    handleStop() {
        window.api.stopSimulation();

        // Update button states
        this.isRunning = false;
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;

        // Unlock configuration panel
        this.unlockConfigPanel();
    }

    async handleExport() {
        try {
            const config = this.configService.collectFullConfig();
            const result = await window.api.saveConfig(config);

            if (result.success) {
                this.logger.addEntry({
                    message: `✅ 配置已导出: ${result.filePath}`,
                    type: 'success',
                    timestamp: new Date().toLocaleTimeString()
                });
            } else {
                this.logger.addEntry({
                    message: `❌ 导出配置失败: ${result.message}`,
                    type: 'error',
                    timestamp: new Date().toLocaleTimeString()
                });
            }
        } catch (error) {
            this.logger.addEntry({
                message: `❌ 导出配置失败: ${error.message}`,
                type: 'error',
                timestamp: new Date().toLocaleTimeString()
            });
        }
    }

    async handleImport() {
        try {
            const result = await window.api.loadConfig();

            if (result.success) {
                this.configService.fillConfigToUI(result.config);
                this.logger.addEntry({
                    message: '✅ 配置已成功导入',
                    type: 'success',
                    timestamp: new Date().toLocaleTimeString()
                });
            } else {
                this.logger.addEntry({
                    message: `❌ 导入配置失败: ${result.message}`,
                    type: 'error',
                    timestamp: new Date().toLocaleTimeString()
                });
            }
        } catch (error) {
            this.logger.addEntry({
                message: `❌ 导入配置失败: ${error.message}`,
                type: 'error',
                timestamp: new Date().toLocaleTimeString()
            });
        }
    }

    collectConfig(mode) {
        const config = {
            mode: mode,
            mqtt: {
                host: getElement('host')?.value || 'localhost',
                port: parseInt(getElement('port')?.value || '1883', 10),
                topic: getElement('topic')?.value || 'v1/devices/me/telemetry'
            }
        };

        if (mode === 'basic') {
            config.device_start_number = parseInt(getElement('device_start_number')?.value || '1', 10);
            config.device_end_number = parseInt(getElement('device_end_number')?.value || '10', 10);
            config.device_prefix = getElement('device_prefix')?.value || 'c';
            config.client_id_prefix = getElement('client_id_prefix')?.value || 'c';
            config.username_prefix = getElement('username_prefix')?.value || 'c';
            config.password_prefix = getElement('password_prefix')?.value || 'c';
            config.send_interval = parseInt(getElement('send_interval')?.value || '1', 10);
            config.data = {
                format: getElement('format')?.value || 'default',
                data_point_count: parseInt(getElement('data_point_count')?.value || '100', 10)
            };
            config.custom_keys = this.customKeyManager.collectBasicKeys();
        } else {
            config.advanced = {
                groups: this.groupManager.collectData()
            };
        }

        return config;
    }

    /**
     * Lock configuration panel during simulation
     */
    lockConfigPanel() {
        // Disable all input elements in both panels
        const inputs = document.querySelectorAll('#basic-panel input, #basic-panel select, #basic-panel button, #advanced-panel input, #advanced-panel select, #advanced-panel button');
        inputs.forEach(input => {
            // Don't disable the stop button
            if (input !== this.stopBtn) {
                input.disabled = true;
            }
        });

        // Disable tab switching
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => btn.disabled = true);

        // Disable export/import buttons
        if (this.exportBtn) this.exportBtn.disabled = true;
        if (this.importBtn) this.importBtn.disabled = true;

        // Add visual feedback
        const panels = document.querySelectorAll('.tab-content');
        panels.forEach(panel => panel.classList.add('locked'));
    }

    /**
     * Unlock configuration panel after simulation stops
     */
    unlockConfigPanel() {
        // Enable all input elements
        const inputs = document.querySelectorAll('#basic-panel input, #basic-panel select, #basic-panel button, #advanced-panel input, #advanced-panel select, #advanced-panel button');
        inputs.forEach(input => {
            input.disabled = false;
        });

        // Enable tab switching
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => btn.disabled = false);

        // Enable export/import buttons
        if (this.exportBtn) this.exportBtn.disabled = false;
        if (this.importBtn) this.importBtn.disabled = false;

        // Remove visual feedback
        const panels = document.querySelectorAll('.tab-content');
        panels.forEach(panel => panel.classList.remove('locked'));

        // Re-apply group button state check
        if (this.groupManager) {
            this.groupManager.updateButtonState();
        }
    }

    /**
     * Setup panel switching between simulator and timestamp tool
     */
    setupPanelSwitching() {
        const navButtons = document.querySelectorAll('.nav-btn');

        navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetPanel = btn.dataset.panel;
                this.switchPanel(targetPanel);
            });
        });
    }

    /**
     * Switch between main panels
     */
    switchPanel(panelName) {
        if (this.currentPanel === panelName) return;

        // Deactivate old panel
        if (this.currentPanel === 'timestamp') {
            this.timestampTool.stop();
        }

        // Hide all panels and deactivate all nav buttons
        document.querySelectorAll('.main-panel').forEach(panel => {
            panel.classList.remove('active');
        });

        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Activate target panel
        const targetPanelEl = document.getElementById(`${panelName}-panel`);
        const targetNavBtn = document.querySelector(`.nav-btn[data-panel="${panelName}"]`);

        if (targetPanelEl) targetPanelEl.classList.add('active');
        if (targetNavBtn) targetNavBtn.classList.add('active');

        // Start timestamp tool if switched to it
        if (panelName === 'timestamp') {
            this.timestampTool.start();
        }

        this.currentPanel = panelName;
        // Save to local storage
        localStorage.setItem('active-panel', panelName);
        console.log(`[App] 切换到面板: ${panelName}`);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new App();
});
