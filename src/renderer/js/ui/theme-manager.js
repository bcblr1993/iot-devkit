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
        'navy-blue': '知性蓝',
        'pro-black': '专业黑'
    };

    static DEFAULT_THEME = 'classic';

    constructor() {
        this.currentTheme = ThemeManager.DEFAULT_THEME;
        this.init();
    }

    /**
     * 初始化主题管理器
     */
    init() {
        // 监听主进程发来的主题变更消息
        if (window.api && window.api.onThemeChange) {
            window.api.onThemeChange((themeName) => {
                this.apply(themeName);
            });
        }

        // 获取保存的主题（从主进程）
        if (window.api && window.api.getCurrentTheme) {
            window.api.getCurrentTheme().then((themeName) => {
                if (themeName) {
                    this.apply(themeName);
                }
            });
        }

        console.log('[ThemeManager] 已初始化');
    }

    /**
     * 应用主题
     * @param {string} themeName - 主题名称
     */
    apply(themeName) {
        if (!ThemeManager.THEMES[themeName]) {
            console.warn(`[ThemeManager] 未知主题: ${themeName}`);
            themeName = ThemeManager.DEFAULT_THEME;
        }

        // 设置 data-theme 属性
        document.documentElement.setAttribute('data-theme', themeName);
        this.currentTheme = themeName;

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
