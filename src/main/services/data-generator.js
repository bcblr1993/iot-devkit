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
 * @param {number} count 需要生成的字段数量
 * @returns {object}
 */
function generateBatteryStatus(count) {
    const data = {};

    for (let i = 1; i <= count; i++) {
        // 循环生成不同类型的值，保持多样性
        const typeIndex = i % 4;
        switch (typeIndex) {
            case 1:
                data[`key_${i}`] = getRandomFloat(0, 100, 2);
                break;
            case 2:
                data[`key_${i}`] = getRandomInt(0, 1000);
                break;
            case 3:
                data[`key_${i}`] = `str_val_${getRandomInt(0, 100)}`;
                break;
            case 0:
                data[`key_${i}`] = getRandomInt(0, 1) === 1;
                break;
        }
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
 * @returns {object} 合并后的数据（自定义 Key 在前）
 */
function mergeCustomKeys(generatedData, customKeys) {
    const customData = generateCustomKeys(customKeys);
    return { ...customData, ...generatedData };  // 自定义 Key 排在前面
}

// ======================== 模板缓存优化 ========================

/**
 * 全局模板缓存
 * Key: 缓存键（由schema、keyCount、customKeys生成）
 * Value: JSON字符串模板
 */
const templateCache = new Map();
const MAX_CACHE_SIZE = 100; // LRU缓存最大大小

/**
 * 生成缓存键
 * @param {Array} schema - Schema数组
 * @param {number} keyCount - Key数量
 * @param {Array} customKeys - 自定义Key数组
 * @returns {string} 缓存键
 */
function getCacheKey(schema, keyCount, customKeys = []) {
    const schemaHash = schema ? JSON.stringify(schema) : 'null';
    const customHash = customKeys.length > 0 ? JSON.stringify(customKeys) : 'empty';
    return `${schemaHash}-${keyCount}-${customHash}`;
}

/**
 * 获取或创建模板（带缓存）
 * @param {Array} schema - Schema数组
 * @param {number} keyCount - Key数量
 * @param {Array} customKeys - 自定义Key数组
 * @returns {string} JSON字符串模板
 */
function getOrCreateTemplate(schema, keyCount, customKeys = []) {
    const cacheKey = getCacheKey(schema, keyCount, customKeys);

    // 缓存命中
    if (templateCache.has(cacheKey)) {
        return templateCache.get(cacheKey);
    }

    // 缓存未命中，生成新模板
    let data = generateTypedData(schema, keyCount);
    if (customKeys.length > 0) {
        data = mergeCustomKeys(data, customKeys);
    }

    const template = JSON.stringify(data);

    // LRU缓存清理：如果缓存满了，删除最旧的条目
    if (templateCache.size >= MAX_CACHE_SIZE) {
        const firstKey = templateCache.keys().next().value;
        templateCache.delete(firstKey);
    }

    templateCache.set(cacheKey, template);
    return template;
}

/**
 * 获取缓存的模板（仅用于基础模式，不带schema）
 * @param {number} keyCount - Key数量
 * @param {string} format - 数据格式 (default/tn/tn-empty)
 * @param {Array} customKeys - 自定义Key数组
 * @returns {string} JSON字符串模板
 */
function getBasicTemplate(keyCount, format, customKeys = []) {
    const cacheKey = `basic-${format}-${keyCount}-${customKeys.length > 0 ? JSON.stringify(customKeys) : 'empty'}`;

    if (templateCache.has(cacheKey)) {
        return templateCache.get(cacheKey);
    }

    let data;
    switch (format) {
        case 'tn':
            data = generateTnPayload(keyCount);
            break;
        case 'tn-empty':
            data = generateTnEmptyPayload();
            break;
        default:
            data = generateBatteryStatus(keyCount);
            break;
    }

    if (customKeys.length > 0) {
        data = mergeCustomKeys(data, customKeys);
    }

    const template = JSON.stringify(data);

    if (templateCache.size >= MAX_CACHE_SIZE) {
        const firstKey = templateCache.keys().next().value;
        templateCache.delete(firstKey);
    }

    templateCache.set(cacheKey, template);
    return template;
}

/**
 * 清理模板缓存（在停止模拟时调用）
 */
function clearTemplateCache() {
    templateCache.clear();
}

/**
 * 获取缓存统计信息
 * @returns {object} 缓存统计
 */
function getCacheStats() {
    return {
        size: templateCache.size,
        maxSize: MAX_CACHE_SIZE
    };
}

// 导出模块函数
module.exports = {
    generateBatteryStatus,
    generateTnPayload,
    generateTnEmptyPayload,
    generateTypedData,
    generateCustomKeys,
    mergeCustomKeys,
    // 模板缓存相关
    getOrCreateTemplate,
    getBasicTemplate,
    clearTemplateCache,
    getCacheStats
};