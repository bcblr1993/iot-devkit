/**
 * @fileoverview 负责生成模拟遥测数据
 */

/**
 * 生成指定范围和精度的随机浮点数
 * @param {number} min_v 最小值
 * @param {number} max_v 最大值
 * @param {number} decimal_places 小数位数
 * @returns {number}
 */
function getRandomFloat(min_v, max_v, decimal_places) {
    return parseFloat(Number(Math.random() * (max_v - min_v) + min_v).toFixed(decimal_places));
}

/**
 * 生成指定范围的随机整数
 * @param {number} min_v 最小值
 * @param {number} max_v 最大值
 * @returns {number}
 */
function getRandomInt(min_v, max_v) {
    return Math.floor(Math.random() * (max_v - min_v + 1)) + min_v;
}

/**
 * 生成 "default" 格式的数据负载
 * @param {number} count 需要补齐的随机键数量
 * @returns {object}
 */
function generateBatteryStatus(count) {
    const data = {
        "wind1": 0,
        "wind3": 0,
        "power": `${getRandomFloat(0, 100, 2)}`,
        "capacity": `${getRandomInt(50, 200)}Ah`,
        "charge_level": `${getRandomInt(0, 100)}%`,
        "health_status": getRandomInt(0, 1) ? "Good" : "Poor",
        "temperature": `${getRandomInt(-20, 45)}C`,
        "cycle_count": getRandomInt(0, 500),
        "remaining_life": `${getRandomInt(0, 100)}%`,
        "charge_rate": `${getRandomFloat(0, 5, 2)}A`
    };

    const base_len = Object.keys(data).length;

    // 如果请求的数量小于基础数量，截取前 count 个
    if (count < base_len) {
        const slicedData = {};
        const keys = Object.keys(data);
        for (let i = 0; i < count; i++) {
            slicedData[keys[i]] = data[keys[i]];
        }
        return slicedData;
    }

    // 如果请求的数量大于基础数量，补齐随机键
    for (let i = base_len + 1; i <= count; i++) {
        data[`random_key_${i}`] = getRandomInt(0, 1000);
    }
    return data;
}

/**
 * 生成 "tn" 格式的数据负载
 * @param {number} count 数据点数量
 * @returns {object}
 */
function generateTnPayload(count) {
    const arr = [];
    for (let i = 0; i < count; i++) {
        arr.push({
            "id": `Tag${i + 1}`,
            "desc": `C1_D1_Tag${i + 1}`,
            "quality": 0,
            "value": Math.random()
        });
    }

    const now = new Date();
    return {
        "type": "real",
        "sn": "TN001",
        "sendStartTime": now.toISOString().replace('T', ' ').substring(0, 19),
        "time": now.getTime(),
        "data": {
            "C24_D1": arr
        }
    };
}

/**
 * 生成 "tn-empty" 格式的数据负载
 * @param {number} count 数据点数量
 * @returns {object}
 */
function generateTnEmptyPayload(count) {
    const now = new Date();
    const data = {
        "type": "real",
        "sn": "TN001",
        "sendStartTime": now.toISOString().replace('T', ' ').substring(0, 19),
        "time": now.getTime(),
        "data": {}
    };
    return data;
}

/**
 * 根据 Schema 生成特定类型的数据
 * @param {Array} schema - Schema 数组
 * @param {number} count - 需要生成的数量（从头开始截取）
 * @returns {object} 数据对象
 */
function generateTypedData(schema, count) {
    const data = {};
    const effectiveCount = Math.min(count, schema.length);

    for (let i = 0; i < effectiveCount; i++) {
        const item = schema[i];
        switch (item.type) {
            case 'float':
                data[item.name] = getRandomFloat(0, 100, 2);
                break;
            case 'int':
                data[item.name] = getRandomInt(0, 1000);
                break;
            case 'string':
                data[item.name] = `str_val_${getRandomInt(0, 100)}`;
                break;
            case 'bool':
                data[item.name] = getRandomInt(0, 1) === 1;
                break;
            default:
                data[item.name] = getRandomFloat(0, 100, 2);
        }
    }
    return data;
}

/**
 * 生成单个自定义 key 的值
 * @param {object} keyDef - key 定义 { name, type, min, max }
 * @returns {any} 生成的值
 */
function generateCustomKeyValue(keyDef) {
    switch (keyDef.type) {
        case 'int':
            const min = keyDef.min !== undefined ? keyDef.min : 0;
            const max = keyDef.max !== undefined ? keyDef.max : 100;
            return getRandomInt(min, max);
        case 'float':
            const fMin = keyDef.min !== undefined ? keyDef.min : 0;
            const fMax = keyDef.max !== undefined ? keyDef.max : 100;
            return getRandomFloat(fMin, fMax, 2);
        case 'string':
            return keyDef.value || `str_${getRandomInt(0, 1000)}`;
        case 'bool':
            return getRandomInt(0, 1) === 1;
        default:
            return null;
    }
}

/**
 * 生成自定义 keys 数据对象
 * @param {Array} customKeys - 自定义 key 定义数组
 * @returns {object} 自定义数据对象
 */
function generateCustomKeys(customKeys) {
    const data = {};
    if (!customKeys || !Array.isArray(customKeys)) {
        return data;
    }

    customKeys.forEach(keyDef => {
        if (keyDef.name) {
            data[keyDef.name] = generateCustomKeyValue(keyDef);
        }
    });

    return data;
}

/**
 * 合并自定义 keys 和生成的数据
 * @param {object} generatedData - 生成的数据
 * @param {Array} customKeys - 自定义 key 定义数组
 * @returns {object} 合并后的数据
 */
function mergeCustomKeys(generatedData, customKeys) {
    const customData = generateCustomKeys(customKeys);
    return { ...generatedData, ...customData };
}

// 导出模块函数
module.exports = {
    generateBatteryStatus,
    generateTnPayload,
    generateTnEmptyPayload,
    generateTypedData,
    generateCustomKeys,
    mergeCustomKeys
};