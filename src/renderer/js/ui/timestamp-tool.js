/**
 * @fileoverview Timestamp Tool Module - 时间戳转换工具
 * 提供时间戳与日期时间的双向转换功能，支持多时区
 */

import { getElement } from '../utils/dom-helpers.js';

/**
 * 支持的时区列表
 */
const TIMEZONES = [
    { value: 'UTC', label: 'UTC (协调世界时)', offset: 0 },
    { value: 'Asia/Shanghai', label: 'UTC+8 北京/上海', offset: 8 },
    { value: 'Asia/Tokyo', label: 'UTC+9 东京', offset: 9 },
    { value: 'Asia/Seoul', label: 'UTC+9 首尔', offset: 9 },
    { value: 'Asia/Singapore', label: 'UTC+8 新加坡', offset: 8 },
    { value: 'Asia/Hong_Kong', label: 'UTC+8 香港', offset: 8 },
    { value: 'America/New_York', label: 'UTC-5/-4 纽约', offset: -5 },
    { value: 'America/Los_Angeles', label: 'UTC-8/-7 洛杉矶', offset: -8 },
    { value: 'America/Chicago', label: 'UTC-6/-5 芝加哥', offset: -6 },
    { value: 'Europe/London', label: 'UTC+0/+1 伦敦', offset: 0 },
    { value: 'Europe/Paris', label: 'UTC+1/+2 巴黎', offset: 1 },
    { value: 'Europe/Berlin', label: 'UTC+1/+2 柏林', offset: 1 },
];

/**
 * 时间戳工具类
 */
export class TimestampTool {
    constructor() {
        this.currentTimeInterval = null;
        this.isActive = false;

        // 1. DOM elements - Current Time
        this.currentDateEl = null;
        this.currentTimeEl = null;
        this.currentTimestampEl = null;
        this.copyCurrentTimestampBtn = null;
        this.copyCurrentDatetimeBtn = null;

        // 2. DOM elements - Timestamp to Date
        this.tsInputEl = null;
        this.tsTimezoneEl = null;
        this.tsResultEl = null;
        this.copyTsResultBtn = null;

        // 3. DOM elements - Date to Timestamp
        this.datetimeInputEl = null;
        this.dtTimezoneEl = null;
        this.dtResultMsEl = null;
        this.copyDtMsBtn = null;

        this.initializeElements();
        this.setupEventListeners();
    }

    /**
     * 初始化 DOM 元素引用
     */
    initializeElements() {
        // Current time elements
        this.currentDateEl = getElement('current-date');
        this.currentTimeEl = getElement('current-time');
        this.currentTimestampEl = getElement('current-timestamp');
        this.copyCurrentTimestampBtn = getElement('copy-current-timestamp');
        this.copyCurrentDatetimeBtn = getElement('copy-current-datetime');

        // Timestamp to date elements
        this.tsInputEl = getElement('ts-input');
        this.tsTimezoneEl = getElement('ts-timezone');
        this.tsResultEl = getElement('ts-result');
        this.copyTsResultBtn = getElement('copy-ts-result');

        // Date to timestamp elements
        this.datetimeInputEl = getElement('datetime-input');
        this.dtTimezoneEl = getElement('dt-timezone');
        this.dtResultMsEl = getElement('dt-result-ms');
        this.copyDtMsBtn = getElement('copy-dt-ms');

        // Populate timezone dropdowns
        this.populateTimezoneSelects();

        // Set default values
        this.setDefaultValues();
    }

    /**
     * 填充时区下拉框
     */
    populateTimezoneSelects() {
        const selects = [this.tsTimezoneEl, this.dtTimezoneEl];

        selects.forEach(select => {
            if (!select) return;

            select.innerHTML = '';
            TIMEZONES.forEach(tz => {
                const option = document.createElement('option');
                option.value = tz.value;
                option.textContent = tz.label;
                select.appendChild(option);
            });

            // 默认选择 Asia/Shanghai
            select.value = 'Asia/Shanghai';
        });
    }

    /**
     * 设置默认值
     */
    setDefaultValues() {
        const now = new Date();

        // Set datetime input to current time (simple format)
        if (this.datetimeInputEl) {
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            this.datetimeInputEl.value = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        }
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // Copy button events
        if (this.copyCurrentTimestampBtn) {
            this.copyCurrentTimestampBtn.addEventListener('click', () => {
                this.copyToClipboard(this.currentTimestampEl?.textContent || '', this.copyCurrentTimestampBtn);
            });
        }

        if (this.copyCurrentDatetimeBtn) {
            this.copyCurrentDatetimeBtn.addEventListener('click', () => {
                const dateText = this.currentDateEl?.textContent || '';
                const timeText = this.currentTimeEl?.textContent || '';
                const dateTimeText = `${dateText} ${timeText}`;
                this.copyToClipboard(dateTimeText, this.copyCurrentDatetimeBtn);
            });
        }

        if (this.copyTsResultBtn) {
            this.copyTsResultBtn.addEventListener('click', () => {
                this.copyToClipboard(this.tsResultEl?.textContent || '', this.copyTsResultBtn);
            });
        }

        if (this.copyDtMsBtn) {
            this.copyDtMsBtn.addEventListener('click', () => {
                this.copyToClipboard(this.dtResultMsEl?.textContent || '', this.copyDtMsBtn);
            });
        }

        // Input change events
        if (this.tsInputEl) {
            this.tsInputEl.addEventListener('input', () => this.convertTimestampToDate());
        }

        if (this.tsTimezoneEl) {
            this.tsTimezoneEl.addEventListener('change', () => this.convertTimestampToDate());
        }

        if (this.datetimeInputEl) {
            this.datetimeInputEl.addEventListener('input', () => this.convertDateToTimestamp());
        }

        if (this.dtTimezoneEl) {
            this.dtTimezoneEl.addEventListener('change', () => this.convertDateToTimestamp());
        }
    }

    /**
     * 启动时间戳工具（进入面板时调用）
     */
    start() {
        if (this.isActive) return;

        this.isActive = true;
        this.updateCurrentTime(); // 立即更新一次

        // 启动定时器，每秒更新当前时间
        this.currentTimeInterval = setInterval(() => {
            this.updateCurrentTime();
        }, 1000);

        console.log('[TimestampTool] 已启动');
    }

    /**
     * 停止时间戳工具（离开面板时调用）
     */
    stop() {
        if (!this.isActive) return;

        this.isActive = false;

        // 清理定时器
        if (this.currentTimeInterval) {
            clearInterval(this.currentTimeInterval);
            this.currentTimeInterval = null;
        }

        console.log('[TimestampTool] 已停止');
    }

    /**
     * 更新当前时间显示
     */
    updateCurrentTime() {
        const now = new Date();

        if (this.currentDateEl) {
            this.currentDateEl.textContent = this.formatDate(now);
        }

        if (this.currentTimeEl) {
            this.currentTimeEl.textContent = this.formatTime(now);
        }

        if (this.currentTimestampEl) {
            this.currentTimestampEl.textContent = now.getTime().toString();
        }
    }

    /**
     * 时间戳转日期
     */
    convertTimestampToDate() {
        if (!this.tsInputEl || !this.tsTimezoneEl || !this.tsResultEl) return;

        const input = this.tsInputEl.value.trim();

        if (!input) {
            this.tsResultEl.textContent = '';
            this.tsResultEl.classList.remove('error');
            return;
        }

        try {
            const timestamp = this.parseTimestamp(input);

            if (!timestamp) {
                throw new Error('Invalid timestamp');
            }

            const timezone = this.tsTimezoneEl.value;
            const dateStr = this.formatDateTimeWithTimezone(new Date(timestamp), timezone);

            this.tsResultEl.textContent = dateStr;
            this.tsResultEl.classList.remove('error');
        } catch (err) {
            this.tsResultEl.textContent = '⚠️ 无效的时间戳格式';
            this.tsResultEl.classList.add('error');
        }
    }

    /**
     * 日期转时间戳
     */
    convertDateToTimestamp() {
        if (!this.datetimeInputEl || !this.dtTimezoneEl) return;
        if (!this.dtResultMsEl) return;

        const datetimeValue = this.datetimeInputEl.value.trim();

        if (!datetimeValue) {
            this.dtResultMsEl.textContent = '';
            return;
        }

        try {
            const timezone = this.dtTimezoneEl.value;

            // 智能解析时间字符串
            const parsedDate = this.parseFlexibleDateTime(datetimeValue);

            if (!parsedDate || isNaN(parsedDate.getTime())) {
                throw new Error('Invalid date format');
            }

            // 获取用户本地时区偏移（分钟）
            const localOffsetMinutes = parsedDate.getTimezoneOffset();

            // 获取目标时区偏移（小时）
            const targetTz = TIMEZONES.find(tz => tz.value === timezone);
            const targetOffsetHours = targetTz ? targetTz.offset : 0;

            // 计算时间戳（调整时区差异）
            // parsedDate 是以浏览器时区解析的，需要调整到目标时区
            const timestamp = parsedDate.getTime() - (targetOffsetHours * 60 + localOffsetMinutes) * 60 * 1000;

            this.dtResultMsEl.textContent = timestamp.toString();

            this.dtResultMsEl.classList.remove('error');
        } catch (err) {
            this.dtResultMsEl.textContent = '⚠️ 无效的日期时间格式';
            this.dtResultMsEl.classList.add('error');
        }
    }

    /**
     * 智能解析多种日期时间格式
     * 支持格式：
     * - 2025-12-13 21:00:00
     * - 2025/12/13 21:00:00
     * - 2025-12-13T21:00:00
     * - 以及浏览器 Date 构造函数支持的其他格式
     */
    parseFlexibleDateTime(input) {
        // 先尝试直接解析
        let date = new Date(input);
        if (!isNaN(date.getTime())) {
            return date;
        }

        // 尝试替换常见分隔符
        const normalized = input
            .replace(/\//g, '-')  // 替换 / 为 -
            .replace(/\s+/g, ' ') // 规范化空格
            .trim();

        date = new Date(normalized);
        if (!isNaN(date.getTime())) {
            return date;
        }

        // 尝试添加 T 分隔符（如果有空格分隔日期和时间）
        const parts = normalized.split(' ');
        if (parts.length >= 2) {
            const withT = parts[0] + 'T' + parts[1];
            date = new Date(withT);
            if (!isNaN(date.getTime())) {
                return date;
            }
        }

        return null;
    }

    /**
     * 解析时间戳输入（自动检测秒级或毫秒级）
     */
    parseTimestamp(input) {
        const num = Number(input);

        if (isNaN(num) || num < 0) {
            return null;
        }

        const str = String(Math.floor(num));

        // 10 位 = 秒级，转换为毫秒
        if (str.length === 10) {
            return num * 1000;
        }

        // 13 位 = 毫秒级
        if (str.length === 13) {
            return num;
        }

        // 其他长度视为无效
        return null;
    }

    /**
     * 格式化日期（YYYY-MM-DD）
     */
    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * 格式化时间（HH:MM:SS）
     */
    formatTime(date) {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    }

    /**
     * 格式化日期时间用于 input[type="datetime-local"]
     * 格式: YYYY-MM-DDTHH:MM:SS
     */
    formatDateTimeForInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    }

    /**
     * 格式化日期用于 input[type="date"]
     */
    formatDateForInput(date) {
        return this.formatDate(date);
    }

    /**
     * 格式化时间用于 input[type="time"]
     */
    formatTimeForInput(date) {
        return this.formatTime(date);
    }

    /**
     * 使用指定时区格式化日期时间
     */
    formatDateTimeWithTimezone(date, timezone) {
        try {
            const options = {
                timeZone: timezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            };

            const formatter = new Intl.DateTimeFormat('zh-CN', options);
            const parts = formatter.formatToParts(date);

            const partsMap = {};
            parts.forEach(part => {
                partsMap[part.type] = part.value;
            });

            return `${partsMap.year}-${partsMap.month}-${partsMap.day} ${partsMap.hour}:${partsMap.minute}:${partsMap.second}`;
        } catch (err) {
            console.error('[TimestampTool] 格式化时区时间失败:', err);
            return this.formatDate(date) + ' ' + this.formatTime(date);
        }
    }

    /**
     * 复制到剪贴板
     */
    async copyToClipboard(text, buttonEl) {
        if (!text) return;

        try {
            await navigator.clipboard.writeText(text);

            // 显示复制成功反馈
            if (buttonEl) {
                const originalText = buttonEl.textContent;
                buttonEl.textContent = '✓ 已复制';
                buttonEl.classList.add('copied');

                setTimeout(() => {
                    buttonEl.textContent = originalText;
                    buttonEl.classList.remove('copied');
                }, 1500);
            }
        } catch (err) {
            console.error('[TimestampTool] 复制失败:', err);

            // 降级方案：使用 execCommand (已废弃但仍可用)
            this.fallbackCopyToClipboard(text, buttonEl);
        }
    }

    /**
     * 降级复制方案
     */
    fallbackCopyToClipboard(text, buttonEl) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);

        try {
            textarea.select();
            document.execCommand('copy');

            if (buttonEl) {
                const originalText = buttonEl.textContent;
                buttonEl.textContent = '✓ 已复制';
                buttonEl.classList.add('copied');

                setTimeout(() => {
                    buttonEl.textContent = originalText;
                    buttonEl.classList.remove('copied');
                }, 1500);
            }
        } catch (err) {
            console.error('[TimestampTool] 降级复制也失败:', err);
            if (buttonEl) {
                buttonEl.textContent = '✗ 复制失败';
            }
        } finally {
            document.body.removeChild(textarea);
        }
    }
}
