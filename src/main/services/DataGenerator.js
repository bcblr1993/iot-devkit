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
            "desc": `desc_${i + 1}`,
            "quality": Math.random(),
            "value": `C1_D1_Tag${i + 1}`
        });
    }

    const now = new Date();
    const data = {
        "type": "real",
        "sn": "TN001",
        "sendStartTime": now.toISOString().replace('T', ' ').substring(0, 19),
        "time": now.getTime(),
        "data": {
            "C24_D1": arr
        }
    };
    return data;
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

// 导出模块函数
module.exports = {
    generateBatteryStatus,
    generateTnPayload,
    generateTnEmptyPayload
};