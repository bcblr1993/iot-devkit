# IoT DevKit 项目开发指南 (Project Context)

> **核心原则**: 保持简单、原生、高效。拒绝过度封装，坚持使用当前已验证的架构模式。

## 1. 项目基础 (Fundamentals)
- **项目名称**: IoT DevKit (MQTT Electron Simulator)
- **核心功能**: 高并发 MQTT 设备模拟、数据上报、实时日志监控。
- **技术栈**:
  - **Core**: Electron
  - **Backend**: Node.js + `mqtt` (原生库)
  - **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
  - **Frameworks**: ❌ **无** (禁止引入 Vue/React/jQuery)

## 2. 核心架构模式 (Architecture Patterns)

### A. 进程通信 (IPC)
- **模式**: `Main` (逻辑) -> `Preload` (桥接) -> `Renderer` (UI)
- **API**: 所有 IPC 方法必须在 `preload.js` 中通过 `contextBridge.exposeInMainWorld('api', ...)` 暴露。
- **数据流**: 
  - **控制流**: Renderer 调用 `window.api.startSimulation(config)` -> Main 执行。
  - **反馈流**: Main 通过 `event.reply` 或 `webContent.send` 推送数据（日志、统计）。

### B. 日志系统 (Logging System) - **当前状态：回滚 (Rolled Back)**
*现状：由于新版日志系统存在 Bug (重复/显示异常)，目前回滚至旧版“批量推送”模式以保证稳定性。*
*未来目标：重新开发健壮的文件级日志中心 (Log Center)。*

1.  **当前实现 (Legacy)**:
    - **后端**: `MqttController` -> `logCallback` -> `Buffer` -> IPC `mqtt-logs-batch`.
    - **前端**: `LoggerUI` (DOM List).
2.  **未来规划 (Roadmap)**:
    - 需实现基于文件的持久化日志 (`winston` 等)。
    - 前端需支持“实时”与“历史”分离查看。
    - **注意**: 下次开发时需吸取教训，确保新旧系统彻底解耦，避免“双重日志”问题。

### C. UI/UX 设计规范
- **主题系统**: 使用 CSS 变量管理颜色 (在 `style.css` 定义)。
- **风格**:
  - **Dark Mode (默认)**: 深色背景 (`#1e1e1e`), 亮色文字 (`#d4d4d4`).
  - **Fira Code**: 日志区域必须使用等宽字体。
  - **Status Colors**: 
    - Success: `green` / `#4ade80` (必须保持绿色高亮)
    - Error: `red` / `#f87171`
    - Info: `blue` / `#60a5fa`
    - Warn: `yellow` / `#fbbf24`

## 3. 目录结构说明 (Directory Map)
```
src/
├── main/
│   ├── index.js           # [核心] 窗口管理，IPC 路由，日志 Buffer 逻辑
│   ├── preload.js         # [核心] API 暴露定义
│   └── services/
│       ├── mqtt-controller.js  # [核心] MQTT 模拟逻辑，Worker 管理
│       ├── data-generator.js   # 数据生成算法
│       └── ...
├── renderer/
│   ├── index.html         # 单页应用入口 (包含 Tab 结构)
│   ├── style.css          # 全局样式表 (包含 Theme 变量)
│   └── js/
│       ├── app.js         # [核心] 前端控制器，组件组装
│       ├── ui/
│       │   ├── logger-ui.js    # [关键] 原始日志 UI 实现
│       │   ├── groups.js       # 分组管理 UI
│       │   └── ...
└── resources/             # 静态资源
```

## 4. 开发注意事项 (Rules of Thumb)

### ✅ Do's (推荐)
- **使用 Class**: UI 模块（如 `LoggerUI`, `GroupManager`）应封装为 ES6 Class。
- **中文注释**: 关键业务逻辑必须保留清晰的中文注释。
- **防御性编程**: 在 `index.js` 中捕获 `uncaughtException` 并通过 IPC 通知前端，防止白屏。

### ❌ Don'ts (禁止)
- **禁止过度封装**: 避免为了设计模式而引入不必要的复杂度。
- **禁止引入编译步骤**: 保持代码可直接运行，不需要 Webpack/Vite 编译（除 Electron Builder 打包外）。
- **不要修改私有 API**: 第三方 `mqtt` 库的内部引用不要随意升级，以免破坏兼容性。

## 5. 项目风格偏好 (Style Preferences)
- **缩进**: 4 Spaces
- **分号**: Always
- **引号**: Single Quotes (`'`)
- **UI 交互**: 按钮 Hover 需有反馈，输入框需有 Focus 状态。

---
*此文件由 AI 助手根据项目现状自动生成，作为后续开发的“记忆锚点”。*
