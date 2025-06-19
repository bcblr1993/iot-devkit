const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const MqttController = require('./services/MqttController');

let mainWindow;
let mqttController;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            // 将预加载脚本附加到渲染进程
            preload: path.join(__dirname, 'preload.js'),
            // 在渲染进程中启用 Node.js API (出于安全考虑，通常不推荐，但此处为简化)
            // 更安全的方式是完全依赖 preload.js 和 ipc
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    mainWindow.loadFile('src/renderer/index.html');

    // 打开开发者工具，方便调试
    // mainWindow.webContents.openDevTools();

    // 初始化 MQTT 控制器，并传入一个日志回调函数
    // 这个回调函数会将日志消息发送到渲染进程
    mqttController = new MqttController((message) => {
        if (mainWindow) {
            mainWindow.webContents.send('log-update', message);
        }
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// --- IPC 通信 ---

// 监听从UI发来的 'get-initial-config' 请求
ipcMain.handle('get-initial-config', () => {
    try {
        const configPath = path.join(app.getAppPath(), 'config.yaml');
        const fileContents = fs.readFileSync(configPath, 'utf8');
        const config = yaml.load(fileContents);
        return config;
    } catch (error) {
        console.error("加载 config.yaml 失败:", error);
        // 返回一个默认配置以防文件不存在
        return {
            mqtt: { host: 'localhost', port: 1883, topic: 'v1/devices/me/telemetry', username_prefix: 'c', password_prefix: 'c', device_count: 10, send_interval: 1 },
            data: { format: 'default', data_point_count: 100 }
        };
    }
});

// 监听从UI发来的 'start-simulation' 命令
ipcMain.on('start-simulation', (event, config) => {
    if (mqttController) {
        // 将日志回调函数作为第二个参数传入
        mqttController.start(config, (message) => {
            if (mainWindow) {
                mainWindow.webContents.send('log-update', message);
            }
        });
    }
});

// 监听从UI发来的 'stop-simulation' 命令
ipcMain.on('stop-simulation', () => {
    if (mqttController) {
        mqttController.stop();
    }
});