/**
 * @fileoverview 预加载脚本
 * 安全地将主进程的功能暴露给渲染进程
 */
const { contextBridge, ipcRenderer } = require('electron');

// 在 window 对象上暴露一个名为 'api' 的全局变量
contextBridge.exposeInMainWorld('api', {
    getInitialConfig: () => ipcRenderer.invoke('get-initial-config'),

    // Simulation control
    startSimulation: (config) => ipcRenderer.invoke('start-simulation', config),
    stopSimulation: () => ipcRenderer.invoke('stop-simulation'),

    // Listen to MQTT logs from main process
    onLog: (callback) => {
        ipcRenderer.on('mqtt-log', (event, logObj) => {
            callback(logObj);
        });
    },
    onLogBatch: (callback) => {
        ipcRenderer.on('mqtt-logs-batch', (event, logs) => {
            callback(logs);
        });
    },

    // Config import/export
    saveConfig: (config) => ipcRenderer.invoke('save-config', config),
    loadConfig: () => ipcRenderer.invoke('load-config'),
});