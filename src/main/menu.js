const { app, Menu, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const isMac = process.platform === 'darwin';

// ======================== Theme Configuration ========================
const THEMES = [
    { id: 'classic', label: '🌞 经典白' },
    { id: 'dark', label: '🌑 暗夜黑' },
    { id: 'navy', label: '🌊 海军蓝' },
    { id: 'professional', label: '💼 专业黑' },
    { id: 'carbon', label: '⚫ 石墨黑' },
    { id: 'obsidian', label: '💎 黑曜石' },
    { id: 'emerald-dark', label: '🌲 森之绿' },
    { id: 'midnight-purple', label: '💜 夜之紫' },
    { id: 'atlas', label: '🌌 工业深蓝' },
    { id: 'aurora', label: '🌈 极光' },
    { id: 'monolith', label: '🗿 权威' },
    { id: 'polar', label: '❄️ 极地' },
    { id: 'void', label: '⚫ 虚空黑' },
    { id: 'cloud', label: '☁️ 云白' },
    { id: 'arctic-light', label: '🧊 极地亮蓝' },
    { id: 'sandstone', label: '🏜️ 暖沙' },
    { id: 'mint-light', label: '🍃 薄荷亮绿' }
];

// Theme config file path
function getThemeConfigPath() {
    return path.join(app.getPath('userData'), 'theme-config.json');
}

// Save theme preference
function saveTheme(themeId) {
    try {
        fs.writeFileSync(getThemeConfigPath(), JSON.stringify({ theme: themeId }), 'utf-8');
        console.log(`[Theme] 主题已保存: ${themeId}`);
    } catch (error) {
        console.error('[Theme] 保存主题失败:', error);
    }
}

// Load saved theme
function loadTheme() {
    try {
        const configPath = getThemeConfigPath();
        if (fs.existsSync(configPath)) {
            const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            return data.theme || 'classic';
        }
    } catch (error) {
        console.error('[Theme] 加载主题失败:', error);
    }
    return 'classic';
}

// Current theme
let currentTheme = null;

function createMenu(mainWindow) {
    // Load saved theme
    currentTheme = loadTheme();
    const template = [
        // { role: 'appMenu' }
        ...(isMac ? [{
            label: app.name,
            submenu: [
                { role: 'about' },
                { type: 'separator' },
                { role: 'services' },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideOthers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        }] : []),
        // { role: 'fileMenu' }
        {
            label: '文件',
            submenu: [
                isMac ? { role: 'close' } : { role: 'quit', label: '退出' }
            ]
        },
        // { role: 'editMenu' }
        {
            label: '编辑',
            submenu: [
                { role: 'undo', label: '撤销' },
                { role: 'redo', label: '重做' },
                { type: 'separator' },
                { role: 'cut', label: '剪切' },
                { role: 'copy', label: '复制' },
                { role: 'paste', label: '粘贴' },
                ...(isMac ? [
                    { role: 'pasteAndMatchStyle', label: '粘贴并匹配样式' },
                    { role: 'delete', label: '删除' },
                    { role: 'selectAll', label: '全选' },
                    { type: 'separator' },
                    {
                        label: 'Speech',
                        submenu: [
                            { role: 'startSpeaking', label: '开始朗读' },
                            { role: 'stopSpeaking', label: '停止朗读' }
                        ]
                    }
                ] : [
                    { role: 'delete', label: '删除' },
                    { type: 'separator' },
                    { role: 'selectAll', label: '全选' }
                ])
            ]
        },
        // { role: 'viewMenu' }
        {
            label: '视图',
            submenu: [
                { role: 'reload', label: '重新加载' },
                { role: 'forceReload', label: '强制重新加载' },
                { role: 'toggleDevTools', label: '切换开发者工具' },
                { type: 'separator' },
                { role: 'resetZoom', label: '重置缩放' },
                { role: 'zoomIn', label: '放大' },
                { role: 'zoomOut', label: '缩小' },
                { type: 'separator' },
                { role: 'togglefullscreen', label: '切换全屏' }
            ]
        },
        // { role: 'windowMenu' }
        {
            label: '窗口',
            submenu: [
                { role: 'minimize', label: '最小化' },
                { role: 'zoom', label: '缩放' },
                ...(isMac ? [
                    { type: 'separator' },
                    { role: 'front', label: '前置所有窗口' },
                    { type: 'separator' },
                    { role: 'window', label: '窗口' }
                ] : [
                    { role: 'close', label: '关闭' }
                ])
            ]
        },
        // Theme Menu
        {
            label: '主题',
            submenu: THEMES.map(theme => ({
                label: theme.label,
                type: 'radio',
                checked: theme.id === currentTheme,
                click: () => {
                    currentTheme = theme.id;
                    saveTheme(theme.id);
                    // Send theme change to renderer
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('theme-change', theme.id);
                    }
                }
            }))
        },
        {
            role: 'help',
            label: '帮助',
            submenu: [
                {
                    label: '📂 打开日志文件夹',
                    click: async () => {
                        const logPath = path.join(app.getPath('userData'), 'logs');
                        if (fs.existsSync(logPath)) {
                            await shell.openPath(logPath);
                        } else {
                            // If logs dir doesn't exist yet, open userData
                            await shell.openPath(app.getPath('userData'));
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: '了解更多',
                    click: async () => {
                        await shell.openExternal('https://github.com/chenyn-chen/mqtt-electron-simulator');
                    }
                },
                // Windows/Linux specific About menu item
                ...(!isMac ? [
                    { type: 'separator' },
                    {
                        label: '关于 MQTT Simulator',
                        click: () => {
                            dialog.showMessageBox(mainWindow, {
                                type: 'info',
                                title: '关于',
                                message: 'MQTT Electron Simulator',
                                detail: `版本: ${app.getVersion()}\nElectron: ${process.versions.electron}\nChrome: ${process.versions.chrome}\nNode.js: ${process.versions.node}\n\n一个用于模拟多设备发送MQTT数据的Electron应用。`,
                                buttons: ['确定'],
                                icon: path.join(__dirname, '../../resources/icons/icon.png')
                            });
                        }
                    }
                ] : [])
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

module.exports = { createMenu, loadTheme };
