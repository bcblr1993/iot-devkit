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
            this.toggleRangeInputs(selectElement, groupId, keyId, 'group');
        };
        window.toggleRangeInputs = (selectElement, id, mode) => {
            this.toggleRangeInputs(selectElement, id, null, mode);
        };
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
                <button type="button" class="btn-remove-key" onclick="document.getElementById('custom-key-group-${groupId}-${keyId}').remove()">删除</button>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', keyHtml);
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
                <button type="button" class="btn-remove-key" onclick="document.getElementById('custom-key-basic-${keyId}').remove()">删除</button>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', keyHtml);
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
