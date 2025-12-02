/**
 * @fileoverview Custom Key Manager - 自定义Key管理组件
 */

export class CustomKeyManager {
    constructor() {
        this.setupGlobalHandlers();
    }

    setupGlobalHandlers() {
        // Global functions for HTML onclick
        window.addCustomKeyToGroup = (groupId) => this.addKeyToGroup(groupId);
        window.toggleGroupKeyRangeInputs = (selectElement, groupId, keyId) => {
            // Fix: correct parameter order - (selectElement, keyId, groupId, mode)
            this.toggleRangeInputs(selectElement, keyId, groupId, 'group');
        };
        window.toggleRangeInputs = (selectElement, id, mode) => {
            this.toggleRangeInputs(selectElement, id, null, mode);
        };
        window.removeCustomKey = (type, groupId, keyId) => {
            this.removeKey(type, groupId, keyId);
        };

        // Listen for changes in Basic Mode data point count
        const basicCountInput = document.getElementById('data_point_count');
        if (basicCountInput) {
            basicCountInput.addEventListener('input', () => this.handleTotalCountChange(null));
        }
    }

    addKeyToGroup(groupId) {
        const keyId = Date.now();
        const container = document.getElementById(`group-custom-keys-${groupId}`);
        if (!container) return;

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
                <button type="button" class="btn-remove-key" onclick="window.removeCustomKey('group', ${groupId}, ${keyId})">删除</button>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', keyHtml);
        this.updateAddButtonState(groupId);
    }

    addKeyToBasic() {
        const keyId = Date.now();
        const container = document.getElementById('custom-keys-basic-container');
        if (!container) return;

        const keyHtml = `
            <div class="custom-key-item" id="custom-key-basic-${keyId}">
                <div>
                    <label>Key 名称</label>
                    <input type="text" class="key-name" placeholder="例如: temperature">
                </div>
                <div>
                    <label>类型</label>
                    <select class="key-type" onchange="toggleRangeInputs(this, ${keyId}, 'basic')">
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
                <button type="button" class="btn-remove-key" onclick="window.removeCustomKey('basic', null, ${keyId})">删除</button>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', keyHtml);
        this.updateAddButtonState(null);
    }

    removeKey(type, groupId, keyId) {
        const id = type === 'group' ? `custom-key-group-${groupId}-${keyId}` : `custom-key-basic-${keyId}`;
        const element = document.getElementById(id);
        if (element) {
            element.remove();
            this.updateAddButtonState(groupId);
        }
    }

    updateAddButtonState(groupId) {
        if (groupId !== null) {
            // Advanced Mode (Group)
            const groupEl = document.getElementById(`group-${groupId}`);
            if (!groupEl) return;

            const keyCountInput = groupEl.querySelector('.group-key-count');
            const customKeysContainer = document.getElementById(`group-custom-keys-${groupId}`);
            // The add button is in the header of the custom keys section
            // We need to find the button that calls addCustomKeyToGroup(${groupId})
            // It's inside .group-custom-keys .section-header .btn-add-small
            const addButton = groupEl.querySelector('.group-custom-keys .btn-add-small');

            if (keyCountInput && customKeysContainer && addButton) {
                const totalPoints = parseInt(keyCountInput.value || 0, 10);
                const currentKeys = customKeysContainer.querySelectorAll('.custom-key-item').length;

                if (currentKeys >= totalPoints) {
                    addButton.disabled = true;
                    addButton.title = "自定义 Key 数量已达到上限 (不能超过总点数)";
                } else {
                    addButton.disabled = false;
                    addButton.title = "";
                }
            }
        } else {
            // Basic Mode
            const keyCountInput = document.getElementById('data_point_count');
            const customKeysContainer = document.getElementById('custom-keys-basic-container');
            const addButton = document.getElementById('add-custom-key-basic');

            if (keyCountInput && customKeysContainer && addButton) {
                const totalPoints = parseInt(keyCountInput.value || 0, 10);
                const currentKeys = customKeysContainer.querySelectorAll('.custom-key-item').length;

                if (currentKeys >= totalPoints) {
                    addButton.disabled = true;
                    addButton.title = "自定义 Key 数量已达到上限 (不能超过总点数)";
                } else {
                    addButton.disabled = false;
                    addButton.title = "";
                }
            }
        }
    }

    handleTotalCountChange(groupId) {
        let totalPoints = 0;
        let customKeysContainer;

        if (groupId !== null) {
            // Advanced Mode
            const groupEl = document.getElementById(`group-${groupId}`);
            if (!groupEl) return;
            const keyCountInput = groupEl.querySelector('.group-key-count');
            totalPoints = parseInt(keyCountInput.value || 0, 10);
            customKeysContainer = document.getElementById(`group-custom-keys-${groupId}`);
        } else {
            // Basic Mode
            const keyCountInput = document.getElementById('data_point_count');
            totalPoints = parseInt(keyCountInput.value || 0, 10);
            customKeysContainer = document.getElementById('custom-keys-basic-container');
        }

        if (customKeysContainer) {
            const keyItems = customKeysContainer.querySelectorAll('.custom-key-item');
            const currentKeys = keyItems.length;

            if (currentKeys > totalPoints) {
                // Remove excess keys from the end
                const keysToRemove = currentKeys - totalPoints;
                for (let i = 0; i < keysToRemove; i++) {
                    // Remove the last element
                    keyItems[currentKeys - 1 - i].remove();
                }
            }
        }

        this.updateAddButtonState(groupId);
    }

    toggleRangeInputs(selectElement, id, groupId, mode) {
        let container;
        if (groupId !== null) {
            // Group mode
            container = document.getElementById(`custom-key-group-${groupId}-${id}`);
        } else {
            // Basic mode
            container = document.getElementById(`custom-key-${mode}-${id}`);
        }

        if (!container) return;

        const rangeInputs = container.querySelectorAll('.range-input');
        const type = selectElement.value;

        rangeInputs.forEach(input => {
            if (type === 'int' || type === 'float') {
                input.style.display = mode === 'basic' ? 'block' : 'flex';
            } else {
                input.style.display = 'none';
            }
        });
    }

    collectBasicKeys() {
        const container = document.getElementById('custom-keys-basic-container');
        if (!container) return [];

        const keys = [];
        const keyElements = container.querySelectorAll('.custom-key-item');

        keyElements.forEach(keyEl => {
            const name = keyEl.querySelector('.key-name')?.value;
            const type = keyEl.querySelector('.key-type')?.value;

            if (name) {
                const keyDef = { name, type };
                if (type === 'int' || type === 'float') {
                    keyDef.min = parseFloat(keyEl.querySelector('.key-min')?.value || 0);
                    keyDef.max = parseFloat(keyEl.querySelector('.key-max')?.value || 100);
                }
                keys.push(keyDef);
            }
        });

        return keys;
    }
}
