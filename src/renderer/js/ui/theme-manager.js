/**
 * @fileoverview Theme Manager - 主题管理器
 * 负责应用主题到 DOM 和监听主进程 IPC 消息
 */

/**
 * 主题管理器类
 */
export class ThemeManager {
    static THEMES = {
        classic: '经典白',
        dark: '暗夜黑',
        navy: '海军蓝',
        professional: '专业黑',
        carbon: '石墨黑',
        obsidian: '黑曜石',
        'emerald-dark': '森之绿',
        'midnight-purple': '夜之紫',
        atlas: '工业深蓝',
        aurora: '极光',
        monolith: '权威',
        polar: '极地',
        void: '虚空黑',
        cloud: '云白',
        'arctic-light': '极地亮蓝',
        sandstone: '暖沙',
        'mint-light': '薄荷亮绿'
    };

    static DEFAULT_THEME = 'classic';

    constructor() {
        this.currentTheme = localStorage.getItem('app-theme') || ThemeManager.DEFAULT_THEME;
        this.init();
    }

    /**
     * 初始化主题管理器
     */
    init() {
        // 1. 初始化下拉菜单监听
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) {
            // 设置初始值
            themeSelect.value = this.currentTheme;

            // 监听变更
            themeSelect.addEventListener('change', (e) => {
                const newTheme = e.target.value;
                this.apply(newTheme);
            });
        }

        // 2. 应用初始主题
        this.apply(this.currentTheme);

        // 3. 兼容旧的 IPC 监听 (如果有)
        if (window.api && window.api.onThemeChange) {
            window.api.onThemeChange((themeName) => {
                this.apply(themeName);
            });
        }

        console.log('[ThemeManager] 已初始化，当前主题:', this.currentTheme);
    }

    /**
     * 应用主题
     * @param {string} themeName - 主题名称
     */
    apply(themeName) {
        if (!ThemeManager.THEMES[themeName]) {
            console.warn(`[ThemeManager] 未知主题: ${themeName}，回退到默认`);
            themeName = ThemeManager.DEFAULT_THEME;
        }

        // 设置 data-theme 属性
        document.documentElement.setAttribute('data-theme', themeName);
        this.currentTheme = themeName;

        // 保存到本地存储
        localStorage.setItem('app-theme', themeName);

        // 同步下拉菜单状态 (如果是通过 IPC 变更)
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect && themeSelect.value !== themeName) {
            themeSelect.value = themeName;
        }

        console.log(`[ThemeManager] 已应用主题: ${ThemeManager.THEMES[themeName]} (${themeName})`);
    }

    /**
     * 获取当前主题
     * @returns {string} 当前主题名称
     */
    getCurrentTheme() {
        return this.currentTheme;
    }

    /**
     * 获取所有可用主题
     * @returns {Object} 主题列表
     */
    static getAllThemes() {
        return ThemeManager.THEMES;
    }
}
