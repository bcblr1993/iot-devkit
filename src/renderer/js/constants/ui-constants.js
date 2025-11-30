/**
 * @fileoverview UI Constants - 前端常量定义
 */

export const UI_CONSTANTS = {
    MAX_GROUPS: 10,
    MIN_GROUPS: 1,
    LOG_LINES_VISIBLE: 15,
    DEFAULT_SEND_INTERVAL: 1,
    DEFAULT_PORT: 1883,
    DEFAULT_TOPIC: 'v1/devices/me/telemetry',
    DEFAULT_HOST: 'localhost',
};

export const DATA_FORMATS = {
    DEFAULT: 'default',
    TN: 'tn',
    TN_EMPTY: 'tn-empty',
};

export const LOG_TYPES = {
    INFO: 'info',
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
};
