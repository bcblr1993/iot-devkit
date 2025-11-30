const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const MqttController = require('./services/mqtt-controller');

// 【修改】将 mainWindow 和 mqttController 的管理放入一个数组中，以便管理多个实例
let windows = [];
let controllers = [];

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    mainWindow.loadFile('src/renderer/index.html');

    // 打开开发者工具（用于调试）
    mainWindow.webContents.openDevTools();

    const mqttController = new MqttController();

    // 将新创建的窗口和控制器存入数组
    const instance = {
        window: mainWindow,
        controller: mqttController,
        id: windows.length
    };
    windows.push(instance);

    // 监听窗口关闭事件，从数组中移除对应的实例
    mainWindow.on('closed', () => {
        // 在关闭时停止对应的控制器
        instance.controller.stop();
        windows = windows.filter(w => w.id !== instance.id);
    });

    return mainWindow;
}

// Global IPC handlers for start/stop simulation
ipcMain.handle('start-simulation', (event, config) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    const windowEntry = windows.find(w => w.window === window);

    if (windowEntry && windowEntry.controller) {
        windowEntry.controller.start(config, (logObj) => {
            // Send logs back to renderer
            if (!window.isDestroyed()) {
                window.webContents.send('mqtt-log', logObj);
            }
        });
    }
});

ipcMain.handle('stop-simulation', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    const windowEntry = windows.find(w => w.window === window);

    if (windowEntry && windowEntry.controller) {
        windowEntry.controller.stop();
    }
});


app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        // 在 macOS 上，当点击 dock 图标并且没有其他窗口打开时，
        // 应该创建一个新窗口。
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// 这个IPC是全局的,用于加载初始配置，可以保持不变
ipcMain.handle('get-initial-config', () => {
    try {
        const configPath = path.join(app.getAppPath(), 'resources/config/default-config.yaml');
        const fileContents = fs.readFileSync(configPath, 'utf8');
        return yaml.load(fileContents);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log("提示: 未找到 default-config.yaml，将使用默认配置启动。");
        } else {
            console.error("加载 default-config.yaml 失败:", error);
        }
        return {
            mqtt: { host: 'localhost', port: 1883, topic: 'v1/devices/me/telemetry', username_prefix: 'c', password_prefix: 'c', device_start_number: 1, device_end_number: 10, send_interval: 1 },
            data: { format: 'default', data_point_count: 100 }
        };
    }
});

// IPC: 保存配置到文件
ipcMain.handle('save-config', async (event, config) => {
    try {
        const { dialog } = require('electron');
        const result = await dialog.showSaveDialog({
            title: '保存配置',
            defaultPath: 'mqtt-simulator-config.json',
            filters: [
                { name: 'JSON 配置文件', extensions: ['json'] },
                { name: '所有文件', extensions: ['*'] }
            ]
        });

        if (result.canceled || !result.filePath) {
            return { success: false, message: '用户取消保存' };
        }

        fs.writeFileSync(result.filePath, JSON.stringify(config, null, 2), 'utf-8');
        return { success: true, message: '配置保存成功', path: result.filePath };
    } catch (error) {
        console.error('保存配置失败:', error);
        return { success: false, message: `保存失败: ${error.message}` };
    }
});

// IPC: 从文件加载配置
ipcMain.handle('load-config', async () => {
    try {
        const { dialog } = require('electron');

        // 1. 先选择文件
        const fileResult = await dialog.showOpenDialog({
            title: '加载配置',
            filters: [
                { name: 'JSON 配置文件', extensions: ['json'] },
                { name: '所有文件', extensions: ['*'] }
            ],
            properties: ['openFile']
        });

        if (fileResult.canceled || fileResult.filePaths.length === 0) {
            return { success: false, message: '用户取消加载' };
        }

        // 2. 显示确认对话框
        const confirmResult = await dialog.showMessageBox({
            type: 'warning',
            buttons: ['取消', '确认导入'],
            defaultId: 1,
            title: '确认导入配置',
            message: '导入配置将覆盖当前所有设置',
            detail: '当前的所有配置（包括基础模式、高级模式、分组和自定义Key）将被替换为文件中的配置。\n\n此操作无法撤销，是否继续？'
        });

        // 用户点击"取消"（索引 0）
        if (confirmResult.response === 0) {
            return { success: false, message: '用户取消导入' };
        }

        // 3. 用户确认，读取并解析文件
        const filePath = fileResult.filePaths[0];
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const config = JSON.parse(fileContent);

        return { success: true, message: '配置加载成功', config };
    } catch (error) {
        console.error('加载配置失败:', error);
        return { success: false, message: `加载失败: ${error.message}` };
    }
});

app.on('window-all-closed', () => {
    // 在非 macOS 系统上，当所有窗口都关闭时，退出应用。
    // 在 macOS 上，应用和菜单栏会保持激活状态，直到用户用 Cmd + Q 显式退出。
    if (process.platform !== 'darwin') {
        app.quit();
    }
});