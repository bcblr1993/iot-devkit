const { app, Menu, shell, dialog } = require('electron');
const path = require('path');

const isMac = process.platform === 'darwin';

function createMenu(mainWindow) {
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
        {
            role: 'help',
            label: '帮助',
            submenu: [
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

module.exports = { createMenu };
