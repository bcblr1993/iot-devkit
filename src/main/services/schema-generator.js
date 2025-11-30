/**
 * @fileoverview 负责生成设备的数据Schema（Key的名称和类型）
 */

class SchemaGenerator {
    /**
     * 根据配置生成 Schema
     * @param {number} keyCount - Key 的总数量
     * @param {object} typeRatio - 各类型的占比 { float, int, string, bool }
     * @returns {Array} Schema 数组 [{ name: 'key1', type: 'float' }, ...]
     */
    static generate(keyCount, typeRatio) {
        const schema = [];
        const ratios = {
            float: typeRatio.float || 0,
            int: typeRatio.int || 0,
            string: typeRatio.string || 0,
            bool: typeRatio.bool || 0
        };

        // 归一化比例，防止总和不为1
        const totalRatio = Object.values(ratios).reduce((a, b) => a + b, 0);
        if (totalRatio === 0) {
            ratios.float = 1; // 默认全为浮点
        } else {
            for (const key in ratios) {
                ratios[key] /= totalRatio;
            }
        }

        // 计算每种类型的数量
        let counts = {
            float: Math.floor(keyCount * ratios.float),
            int: Math.floor(keyCount * ratios.int),
            string: Math.floor(keyCount * ratios.string),
            bool: Math.floor(keyCount * ratios.bool)
        };

        // 补齐剩余数量（由于向下取整可能少几个）
        let currentCount = Object.values(counts).reduce((a, b) => a + b, 0);
        while (currentCount < keyCount) {
            counts.float++; // 简单粗暴加给 float
            currentCount++;
        }

        // 生成 Schema
        let keyIndex = 1;

        // 按顺序生成，保证类型分布均匀（或者按块生成也可以，这里简单起见按块生成）
        // 1. Float Keys
        for (let i = 0; i < counts.float; i++) {
            schema.push({ name: `float_key_${keyIndex++}`, type: 'float' });
        }
        // 2. Int Keys
        for (let i = 0; i < counts.int; i++) {
            schema.push({ name: `int_key_${keyIndex++}`, type: 'int' });
        }
        // 3. String Keys
        for (let i = 0; i < counts.string; i++) {
            schema.push({ name: `str_key_${keyIndex++}`, type: 'string' });
        }
        // 4. Bool Keys
        for (let i = 0; i < counts.bool; i++) {
            schema.push({ name: `bool_key_${keyIndex++}`, type: 'bool' });
        }

        return schema;
    }
}

module.exports = SchemaGenerator;
