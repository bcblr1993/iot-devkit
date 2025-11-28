const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const MqttController = require('./services/MqttController');

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

    // 为这个新窗口设置IPC监听
    setupIpcForWindow(instance);
}

// 【新增】为特定窗口实例设置IPC处理
function setupIpcForWindow(instance) {
    const { window, controller } = instance;

    const startHandler = (event, config) => {
        // 确保事件来自正确的窗口
        if (event.sender === window.webContents) {
            controller.start(config, (messages) => {
                if (!window.isDestroyed()) {
                    window.webContents.send('log-update', messages);
                }
            });
        }
    };

    const stopHandler = (event) => {
        if (event.sender === window.webContents) {
            controller.stop();
        }
    };

    // 绑定监听
    ipcMain.on('start-simulation', startHandler);
    ipcMain.on('stop-simulation', stopHandler);

    // 当窗口关闭时，移除这些特定的监听器，防止内存泄漏
    window.on('closed', () => {
        ipcMain.removeListener('start-simulation', startHandler);
        ipcMain.removeListener('stop-simulation', stopHandler);
    });
}


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

// 这个IPC是全局的，用于加载初始配置，可以保持不变
ipcMain.handle('get-initial-config', () => {
    try {
        const configPath = path.join(app.getAppPath(), 'config.yaml');
        const fileContents = fs.readFileSync(configPath, 'utf8');
        return yaml.load(fileContents);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log("提示: 未找到 config.yaml，将使用默认配置启动。");
        } else {
            console.error("加载 config.yaml 失败:", error);
        }
        return {
            mqtt: { host: 'localhost', port: 1883, topic: 'v1/devices/me/telemetry', username_prefix: 'c', password_prefix: 'c', device_start_number: 1, device_end_number: 10, send_interval: 1 },
            data: { format: 'default', data_point_count: 100 }
        };
    }
});

app.on('window-all-closed', () => {
    // 在非 macOS 系统上，当所有窗口都关闭时，退出应用。
    // 在 macOS 上，应用和菜单栏会保持激活状态，直到用户用 Cmd + Q 显式退出。
    if (process.platform !== 'darwin') {
        app.quit();
    }
});