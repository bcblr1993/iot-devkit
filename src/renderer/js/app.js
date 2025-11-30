/**
 * @fileoverview Main Application Entry Point - 应用主入口
 */

import { getElement } from './utils/dom-helpers.js';
import { LoggerUI } from './ui/logger-ui.js';
import { TabManager } from './ui/tabs.js';
import { GroupManager } from './ui/groups.js';
import { CustomKeyManager } from './ui/custom-keys.js';
import { ConfigService } from './services/config-service.js';

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
        this.tabManager = new TabManager((mode) => this.onModeChange(mode));
        this.groupManager = new GroupManager();
        this.customKeyManager = new CustomKeyManager();
        this.configService = new ConfigService(this.tabManager, this.groupManager, this.customKeyManager);

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
    }

    async loadInitialConfig() {
        try {
            const config = await window.api.getInitialConfig();

            //Fill basic config
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
        } catch (error) {
            console.error('Failed to load initial config:', error);
        }
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
    }

    handleStop() {
        window.api.stopSimulation();

        // Update button states
        this.isRunning = false;
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
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
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new App();
});
