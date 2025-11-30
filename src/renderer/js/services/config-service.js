/**
 * @fileoverview Config Service - 配置导入/导出服务
 */

import { getElement } from '../utils/dom-helpers.js';

export class ConfigService {
    constructor(tabManager, groupManager, customKeyManager) {
        this.tabManager = tabManager;
        this.groupManager = groupManager;
        this.customKeyManager = customKeyManager;
    }

    /**
     * 收集完整配置
     */
    collectFullConfig() {
        const mode = this.tabManager.getCurrentMode();

        return {
            version: "1.0",
            mode: mode,
            mqtt: {
                host: getElement('host')?.value || 'localhost',
                port: parseInt(getElement('port')?.value || '1883', 10),
                topic: getElement('topic')?.value || 'v1/devices/me/telemetry'
            },
            basic: {
                device_start_number: parseInt(getElement('device_start_number')?.value || '1', 10),
                device_end_number: parseInt(getElement('device_end_number')?.value || '10', 10),
                device_prefix: getElement('device_prefix')?.value || 'c',
                client_id_prefix: getElement('client_id_prefix')?.value || 'c',
                username_prefix: getElement('username_prefix')?.value || 'c',
                password_prefix: getElement('password_prefix')?.value || 'c',
                send_interval: parseInt(getElement('send_interval')?.value || '1', 10),
                format: getElement('format')?.value || 'default',
                data_point_count: parseInt(getElement('data_point_count')?.value || '100', 10),
                custom_keys: this.customKeyManager.collectBasicKeys()
            },
            advanced: {
                groups: this.groupManager.collectData()
            }
        };
    }

    /**
     * 填充配置到UI
     */
    fillConfigToUI(config) {
        if (!config || typeof config !== 'object') {
            throw new Error('无效的配置格式');
        }

        // Fill MQTT settings
        if (config.mqtt) {
            this.setElementValue('host', config.mqtt.host);
            this.setElementValue('port', config.mqtt.port);
            this.setElementValue('topic', config.mqtt.topic);
        }

        // Fill Basic Mode settings
        if (config.basic) {
            this.setElementValue('device_start_number', config.basic.device_start_number);
            this.setElementValue('device_end_number', config.basic.device_end_number);
            this.setElementValue('device_prefix', config.basic.device_prefix);
            this.setElementValue('client_id_prefix', config.basic.client_id_prefix);
            this.setElementValue('username_prefix', config.basic.username_prefix);
            this.setElementValue('password_prefix', config.basic.password_prefix);
            this.setElementValue('send_interval', config.basic.send_interval);
            this.setElementValue('format', config.basic.format);
            this.setElementValue('data_point_count', config.basic.data_point_count);

            // Rebuild custom keys for basic mode
            this.rebuildBasicCustomKeys(config.basic.custom_keys);
        }

        // Fill Advanced Mode settings
        if (config.advanced && config.advanced.groups) {
            this.rebuildGroups(config.advanced.groups);
        }

        // Switch to the configured mode
        if (config.mode) {
            // Manually switch tabs without going through event system
            const tabBtns = document.querySelectorAll('.tab-btn');
            const tabContents = document.querySelectorAll('.tab-content');

            tabBtns.forEach(btn => {
                if (btn.dataset.tab === config.mode) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });

            tabContents.forEach(content => {
                const panel = content;
                if (panel.id === `${config.mode}-panel`) {
                    panel.classList.add('active');
                } else {
                    panel.classList.remove('active');
                }
            });

            // Update tab manager's current mode
            this.tabManager.currentMode = config.mode;
        }
    }

    setElementValue(id, value) {
        const el = getElement(id);
        if (el && value !== undefined) {
            el.value = value;
        }
    }

    rebuildBasicCustomKeys(customKeys) {
        const container = getElement('custom-keys-basic-container');
        if (!container) return;

        container.innerHTML = '';

        if (customKeys && Array.isArray(customKeys)) {
            customKeys.forEach(keyDef => {
                this.customKeyManager.addKeyToBasic();
                const lastKey = container.lastElementChild;
                if (lastKey) {
                    lastKey.querySelector('.key-name').value = keyDef.name || '';
                    lastKey.querySelector('.key-type').value = keyDef.type || 'int';
                    if (keyDef.type === 'int' || keyDef.type === 'float') {
                        lastKey.querySelector('.key-min').value = keyDef.min !== undefined ? keyDef.min : 0;
                        lastKey.querySelector('.key-max').value = keyDef.max !== undefined ? keyDef.max : 100;
                    }
                }
            });
        }
    }

    rebuildGroups(groups) {
        const container = getElement('groups-container');
        if (!container) return;

        container.innerHTML = '';

        if (groups && Array.isArray(groups)) {
            groups.forEach(groupData => {
                this.groupManager.addGroup();
                const lastGroup = container.lastElementChild;
                if (lastGroup) {
                    this.fillGroupData(lastGroup, groupData);
                }
            });
        }

        this.groupManager.updateButtonState();
    }

    fillGroupData(groupElement, groupData) {
        groupElement.querySelector('.group-name').value = groupData.name || '';
        groupElement.querySelector('.group-key-count').value = groupData.keyCount || 10;
        groupElement.querySelector('.group-start').value = groupData.start || 1;
        groupElement.querySelector('.group-end').value = groupData.end || 10;
        groupElement.querySelector('.group-device-prefix').value = groupData.devicePrefix || 'dev-';
        groupElement.querySelector('.group-client-id-prefix').value = groupData.clientIdPrefix || 'cli-';
        groupElement.querySelector('.group-username-prefix').value = groupData.usernamePrefix || 'usr-';
        groupElement.querySelector('.group-password-prefix').value = groupData.passwordPrefix || 'pwd-';
        groupElement.querySelector('.group-full-interval').value = groupData.fullInterval || 300;
        groupElement.querySelector('.group-change-interval').value = groupData.changeInterval || 1;
        groupElement.querySelector('.group-change-ratio').value = groupData.changeRatio || 0.3;

        if (groupData.typeRatio) {
            groupElement.querySelector('.ratio-float').value = groupData.typeRatio.float || 0.25;
            groupElement.querySelector('.ratio-int').value = groupData.typeRatio.int || 0.25;
            groupElement.querySelector('.ratio-string').value = groupData.typeRatio.string || 0.25;
            groupElement.querySelector('.ratio-bool').value = groupData.typeRatio.bool || 0.25;
        }

        // Add custom keys for this group
        if (groupData.customKeys && Array.isArray(groupData.customKeys)) {
            const groupId = groupElement.id.replace('group-', '');
            const customKeysContainer = groupElement.querySelector(`#group-custom-keys-${groupId}`);

            groupData.customKeys.forEach(keyDef => {
                window.addCustomKeyToGroup(groupId);
                const lastKey = customKeysContainer.lastElementChild;
                lastKey.querySelector('.key-name').value = keyDef.name || '';
                lastKey.querySelector('.key-type').value = keyDef.type || 'int';
                if (keyDef.type === 'int' || keyDef.type === 'float') {
                    lastKey.querySelector('.key-min').value = keyDef.min !== undefined ? keyDef.min : 0;
                    lastKey.querySelector('.key-max').value = keyDef.max !== undefined ? keyDef.max : 100;
                }
            });
        }
    }
}
