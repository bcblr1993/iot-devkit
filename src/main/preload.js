/**
 * @fileoverview 预加载脚本
 * 安全地将主进程的功能暴露给渲染进程
 */
const { contextBridge, ipcRenderer } = require('electron');

// 在 window 对象上暴露一个名为 'api' 的全局变量
contextBridge.exposeInMainWorld('api', {
    // 启动模拟
    startSimulation: (config) => ipcRenderer.invoke('start-simulation', config),
    // 停止模拟
    stopSimulation: () => ipcRenderer.invoke('stop-simulation'),
    // 获取初始配置
    getInitialConfig: () => ipcRenderer.invoke('get-initial-config'),
    // 监听主进程日志
    onLog: (callback) => ipcRenderer.on('mqtt-log', (event, logEntry) => callback(logEntry)),
    // 保存配置到文件
    saveConfig: (config) => ipcRenderer.invoke('save-config', config),
    // 从文件加载配置
    loadConfig: () => ipcRenderer.invoke('load-config')
});