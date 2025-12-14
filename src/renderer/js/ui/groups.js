/**
 * @fileoverview Group Manager - 分组管理组件
 */

import { getElement, dispatchCustomEvent } from '../utils/dom-helpers.js';
import { UI_CONSTANTS } from '../constants/ui-constants.js';

export class GroupManager {
    constructor() {
        this.container = getElement('groups-container');
        this.addButton = getElement('add-group-btn');
        this.setupEvents();
        this.setupGlobalHandlers();
    }

    setupEvents() {
        if (this.addButton) {
            this.addButton.addEventListener('click', () => this.addGroup());
        }

        // Listen for group deletion events
        document.addEventListener('group-deleted', () => {
            this.updateButtonState();
        });

        // Event delegation for group header toggle
        if (this.container) {
            this.container.addEventListener('click', (e) => {
                const header = e.target.closest('.group-header');
                if (header && !e.target.closest('.delete-group-btn')) {
                    this.toggleGroup(header);
                }
            });
        }
    }

    toggleGroup(header) {
        const groupId = header.dataset.groupId;
        const groupForm = document.querySelector(`[data-group-form="${groupId}"]`);
        const toggleIcon = header.querySelector('.group-toggle-icon');

        if (groupForm && toggleIcon) {
            groupForm.classList.toggle('collapsed');
            toggleIcon.classList.toggle('rotated');
        }
    }

    setupGlobalHandlers() {
        // Global delete group function
        window.deleteGroup = (groupId) => this.deleteGroup(groupId);
    }

    addGroup() {
        const currentCount = this.container ? this.container.children.length : 0;

        if (currentCount >= UI_CONSTANTS.MAX_GROUPS) {
            alert(`最多只能添加 ${UI_CONSTANTS.MAX_GROUPS} 个分组`);
            return;
        }

        const id = Date.now();
        const groupNumber = currentCount + 1;
        const groupLetter = String.fromCharCode(65 + currentCount);

        const groupHtml = this.getGroupTemplate(id, groupNumber, groupLetter);
        this.container.insertAdjacentHTML('beforeend', groupHtml);

        this.updateButtonState();
    }

    deleteGroup(groupId) {
        const currentCount = this.container ? this.container.children.length : 0;

        if (currentCount <= UI_CONSTANTS.MIN_GROUPS) {
            alert('至少需要保留一个分组！');
            return;
        }

        const groupElement = document.getElementById(`group-${groupId}`);
        if (groupElement) {
            groupElement.remove();
            dispatchCustomEvent('group-deleted', { groupId });
            this.updateButtonState();
        }
    }

    updateButtonState() {
        if (!this.addButton || !this.container) return;

        const currentCount = this.container.children.length;

        if (currentCount >= UI_CONSTANTS.MAX_GROUPS) {
            this.addButton.disabled = true;
            this.addButton.title = `最多只能添加 ${UI_CONSTANTS.MAX_GROUPS} 个分组`;
        } else {
            this.addButton.disabled = false;
            this.addButton.title = '添加新分组';
        }
    }

    getGroupTemplate(id, number, letter) {
        return `
            <div class="group-item" id="group-${id}">
                <div class="group-header" data-group-id="${id}">
                    <span class="group-toggle-icon">▼</span>
                    <span class="group-title">分组 #${number}</span>
                    <button class="delete-group-btn" onclick="event.stopPropagation(); window.deleteGroup(${id})">删除</button>
                </div>
                <div class="group-form" data-group-form="${id}">
                    <div>
                        <label>分组名称</label>
                        <input type="text" class="group-name" value="Group ${letter}">
                    </div>
                    <div>
                        <label>起始设备编号</label>
                        <input type="number" class="group-start" value="10">
                    </div>
                    <div>
                        <label>结束设备编号</label>
                        <input type="number" class="group-end" value="20">
                    </div>
                    
                    <!-- Credential Prefixes -->
                    <div>
                        <label>设备名称前缀</label>
                        <input type="text" class="group-device-prefix" value="devices-">
                    </div>
                    <div>
                        <label>ClientId 前缀</label>
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

                    <div>
                        <label>单个设备总点数</label>
                        <input type="number" class="group-key-count" value="10" oninput="window.customKeyManager.handleTotalCountChange(${id})">
                    </div>
                    <div>
                        <label>突变百分比 (0-1)</label>
                        <input type="number" class="group-change-ratio" value="0.3" step="0.1" max="1" min="0">
                    </div>
                    <div>
                        <label>变化频率 (秒)</label>
                        <input type="number" class="group-change-interval" value="1">
                    </div>
                    <div>
                        <label>全量频率 (秒)</label>
                        <input type="number" class="group-full-interval" value="300">
                    </div>
                    
                    <!-- Custom Keys for this group -->
                    <div class="group-custom-keys" style="grid-column: 1 / -1;">
                        <div class="section-header">
                            <h4>📌 自定义 Key</h4>
                            <button type="button" class="btn-add-small" onclick="window.addCustomKeyToGroup(${id})">+ 添加</button>
                        </div>
                        <div class="custom-keys-container" id="group-custom-keys-${id}">
                            <!-- Custom keys for this group -->
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    collectData() {
        const groupElements = document.querySelectorAll('.group-item');
        const groupsData = [];

        groupElements.forEach(el => {
            const groupId = el.id.replace('group-', '');
            const customKeysContainer = el.querySelector(`#group-custom-keys-${groupId}`);
            const customKeys = this.collectGroupCustomKeys(customKeysContainer);

            groupsData.push({
                name: el.querySelector('.group-name').value,
                start: parseInt(el.querySelector('.group-start').value, 10),
                end: parseInt(el.querySelector('.group-end').value, 10),
                keyCount: parseInt(el.querySelector('.group-key-count').value, 10),
                devicePrefix: el.querySelector('.group-device-prefix').value,
                clientIdPrefix: el.querySelector('.group-client-id-prefix').value,
                usernamePrefix: el.querySelector('.group-username-prefix').value,
                passwordPrefix: el.querySelector('.group-password-prefix').value,
                fullInterval: parseInt(el.querySelector('.group-full-interval').value, 10),
                changeInterval: parseInt(el.querySelector('.group-change-interval').value, 10),
                changeRatio: parseFloat(el.querySelector('.group-change-ratio').value),
                customKeys
            });
        });

        return groupsData;
    }

    collectGroupCustomKeys(container) {
        if (!container) return [];

        const keys = [];
        const keyElements = container.querySelectorAll('.custom-key-item');

        keyElements.forEach(keyEl => {
            const name = keyEl.querySelector('.key-name')?.value;
            const type = keyEl.querySelector('.key-type')?.value;
            const valueMode = keyEl.querySelector('.key-value-mode')?.value || 'random';

            if (name) {
                const keyDef = { name, type, valueMode };

                if (valueMode === 'random' && (type === 'int' || type === 'float')) {
                    keyDef.min = parseFloat(keyEl.querySelector('.key-min')?.value || 0);
                    keyDef.max = parseFloat(keyEl.querySelector('.key-max')?.value || 100);
                } else if (valueMode === 'static') {
                    keyDef.staticValue = keyEl.querySelector('.key-static-value')?.value || '';
                }

                keys.push(keyDef);
            }
        });

        return keys;
    }
}
