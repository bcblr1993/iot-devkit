// Global functions that need to be accessible from HTML onclick attributes
// These must be defined outside DOMContentLoaded

// Delete group function
window.deleteGroup = function (groupId) {
    const groupsContainer = document.getElementById('groups-container');
    const currentGroupCount = groupsContainer ? groupsContainer.children.length : 0;

    // Prevent deleting the last group
    if (currentGroupCount <= 1) {
        alert('至少需要保留一个分组！');
        return;
    }

    const groupElement = document.getElementById(`group-${groupId}`);
    if (groupElement) {
        groupElement.remove();
        // Trigger update of add button state
        const event = new CustomEvent('groupDeleted');
        document.dispatchEvent(event);
    }
};

// Add custom key to group function
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

// Toggle group key range inputs
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

// Toggle range inputs for basic mode
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
