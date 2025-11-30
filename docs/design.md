
**`design.md`**
```markdown
# 设计文档 - MQTT 设备模拟器

本文档概述了将 Python MQTT 模拟工具重构为 Electron 桌面应用的设计思路和技术架构。

## 1. 核心架构：Electron 进程模型

本项目遵循 Electron 标准的 **主进程-渲染进程** 模型，以实现功能分离和性能优化。

-   **主进程 (`src/main/main.js`)**
    -   **职责**:
        -   创建和管理应用窗口 (`BrowserWindow`)。
        -   处理应用的生命周期事件（启动、关闭等）。
        -   作为“后端”服务器，运行所有 Node.js 密集型任务。
        -   实例化和控制 `MqttController`，这是所有模拟任务的核心。
        -   通过 `ipcMain` 监听来自渲染进程的命令（如启动/停止模拟）。
        -   通过 `webContents.send` 将日志和状态更新推送到渲染进程。
    -   **设计决策**: 将 MQTT 客户端管理和数据发送逻辑完全放在主进程中，可以防止复杂的网络活动和定时器阻塞 UI，确保用户界面始终保持响应。

-   **渲染进程 (`src/renderer/`)**
    -   **职责**:
        -   渲染用户界面 (`index.html` 和 `style.css`)。
        -   处理用户交互 (`renderer.js`)，例如表单输入和按钮点击。
        -   通过 `preload.js` 暴露的 `window.api` 对象，向主进程发送命令。
        -   监听从主进程推送来的日志更新，并将其显示在文本区域中。
    -   **设计决策**: 渲染进程只负责“展示”和“用户输入”，不包含任何核心业务逻辑，保持其轻量和高效。

-   **预加载脚本 (`src/main/preload.js`)**
    -   **职责**:
        -   在渲染进程的 Web 环境加载之前运行，可以访问 Node.js API。
        -   使用 `contextBridge` 在 `window` 对象上安全地暴露一个 `api` 对象。
        -   这个 `api` 对象充当了渲染进程和主进程之间的唯一、受控的通信桥梁，避免了将 `ipcRenderer` 等强大 API 直接暴露给渲染进程，提高了安全性。

## 2. 模块化设计

为了代码的可维护性和可读性，核心功能被拆分为独立的模块。

-   **`MqttController.js`**:
    -   这是一个面向对象的类，封装了所有与 MQTT 模拟相关的逻辑。
    -   它维护着所有客户端实例和定时器 (`setInterval`) 的列表。
    -   提供 `start(config)` 和 `stop()` 两个公共方法，供主进程调用。
    -   通过构造函数接收一个回调函数，用于将内部产生的日志实时传递出去，实现了与主进程的解耦。

-   **`DataGenerator.js`**:
    -   一个纯函数模块，仅负责根据输入生成指定格式的模拟数据。
    -   它不依赖任何外部状态，易于测试和复用。

## 3. 数据流

**用户启动模拟的流程：**

1.  **UI (renderer.js)**: 用户点击“启动”按钮。
2.  **UI (renderer.js)**: 从表单收集配置数据，调用 `window.api.startSimulation(config)`。
3.  **Bridge (preload.js)**: `startSimulation` 函数被触发，它使用 `ipcRenderer.send('start-simulation', config)` 向主进程发送消息。
4.  **Main (main.js)**: `ipcMain.on('start-simulation', ...)` 监听到该消息。
5.  **Main (main.js)**: 调用 `mqttController.start(config)`，将配置传递给控制器。
6.  **Controller (MqttController.js)**:
    -   循环创建指定数量的 `mqtt` 客户端。
    -   为每个客户端设置事件监听器（`connect`, `error`等）。
    -   当客户端连接成功时，启动一个 `setInterval` 来定时生成和发布数据。
    -   在每个关键步骤（如连接、发送），调用构造函数传入的 `logCallback`，将日志消息发送出去。
7.  **Main (main.js)**: `logCallback` 被执行，它拿到日志消息，并通过 `mainWindow.webContents.send('log-update', message)` 将消息推送到渲染进程。
8.  **Bridge (preload.js)**: `window.api.onLogUpdate` 注册的回调被触发。
9.  **UI (renderer.js)**: 回调函数执行，将收到的日志消息追加到页面的 `<textarea>` 中。

这个单向数据流（命令从 UI 到 Main，状态从 Main 到 UI）使得应用状态清晰可控。