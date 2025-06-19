# MQTT 设备模拟器

这是一个使用 Electron 构建的桌面应用程序，用于模拟大量物联网设备通过 MQTT 协议连接到服务器并发送遥测数据。本应用是对一个 Python 脚本工具的重构，提供了图形用户界面（GUI）以便于配置和监控。

## ✨ 功能特性

- **图形化配置**：通过界面轻松配置 MQTT Broker 地址、端口、主题、设备数量等。
- **双数据格式**：支持生成两种预定义的 JSON 数据格式 (`default` 和 `tn`)。
- **实时日志**：在界面中实时查看每个设备的连接状态和数据发送日志。
- **高并发模拟**：利用 Node.js 的异步特性，高效模拟上百个设备。
- **跨平台**：得益于 Electron，可在 Windows、macOS 和 Linux 上运行。

## 📂 项目结构
mqtt-electron-simulator/
├── 📂 src/
│   ├── 📂 main/
│   │   ├── 📄 main.js         # ✅ Electron 主进程入口
│   │   ├── 📄 preload.js      # ✅ 渲染进程与主进程的桥梁
│   │   └── 📂 services/
│   │       ├── 📄 MqttController.js # 🧠 核心：管理所有MQTT设备和模拟
│   │       └── 📄 DataGenerator.js # 📦 数据生成逻辑
│   ├── 📂 renderer/
│   │   ├── 📄 index.html      # 🎨 UI 界面
│   │   ├── 📄 renderer.js     # 🖥️ UI 的交互逻辑
│   │   └── 📄 style.css       # ✨ UI 的样式
├── 📄 package.json          # 📦 项目依赖和脚本
├── 📄 design.md             # 📐 设计文档 (本节内容)
└── 📄 README.md             # 📖 项目说明文档