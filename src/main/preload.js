/**
 * @fileoverview 预加载脚本
 * 安全地将主进程的功能暴露给渲染进程
 */
const { contextBridge, ipcRenderer } = require('electron');

// 在 window 对象上暴露一个名为 'api' 的全局变量
contextBridge.exposeInMainWorld('api', {
    // 暴露一个函数用于请求初始配置
    getInitialConfig: () => ipcRenderer.invoke('get-initial-config'),

    // 暴露一个函数用于发送 'start' 命令到主进程
    startSimulation: (config) => ipcRenderer.send('start-simulation', config),

    // 暴露一个函数用于发送 'stop' 命令到主进程
    stopSimulation: () => ipcRenderer.send('stop-simulation'),

    // 暴露一个函数，允许渲染进程注册一个回调来接收日志更新
    onLogUpdate: (callback) => ipcRenderer.on('log-update', (event, message) => {
        callback(message);
    })
});