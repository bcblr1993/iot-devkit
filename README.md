# MQTT 设备模拟器

<div align="center">

📡 一个功能强大的 Electron 桌面应用，用于模拟大量物联网设备通过 MQTT 协议发送遥测数据

[![Electron](https://img.shields.io/badge/Electron-28.3.3-blue.svg)](https://www.electronjs.org/)
[![License](https://img.shields.io/badge/License-ISC-green.svg)](LICENSE)

</div>

## ✨ 功能特性

### 🎯 核心功能
- **双模式支持**：基础模式（快速配置）+ 高级模式（分组管理，最多10组）
- **高并发模拟**：利用 Node.js 异步特性，轻松模拟数百个设备
- **实时日志系统**：
  - 实时搜索与过滤
  - 高亮显示搜索结果
  - 条件显示JSON数据（仅搜索时）
  - 可折叠JSON视图，支持一键复制
- **配置管理**：
  - 导入/导出配置为JSON
  - 配置面板锁定（模拟运行时防止误操作）
- **多数据格式**：支持 `default`、`tn`、`tn-empty` 三种数据格式
- **自定义Key**：支持添加自定义数据字段（整数、浮点、字符串、布尔）

### 🚀 性能优化
- **内存管理**：DOM元素自动清理（最多500条），防止长时间运行白屏
- **日志采样**：智能采样（每10次记录1次），减少90%日志量
- **IPC优化**：降低主进程与渲染进程通信压力

### 🎨 用户体验
- **锁定保护**：模拟运行时自动锁定配置面板，带视觉反馈
- **凭证生成**：自动零填充（如 `c01`, `c09`, `c10`）
- **跨平台图标**：支持 Windows、macOS、Linux
- **时间戳版本**：打包文件自动添加时间戳（如 `1.0.0-20251201135545`）

## 📦 安装与运行

### 环境要求
- Node.js 16.x 或更高版本
- npm 或 yarn

### 开发模式
```bash
# 克隆仓库
git clone <repository-url>
cd mqtt-electron-simulator

# 安装依赖
npm install

# 启动应用
npm start
```

### 打包发布
```bash
# 打包 Windows 版本（自动添加时间戳）
npm run build:win

# 打包 macOS 版本
npm run build:mac

# 打包 Linux 版本
npm run build:linux

# 打包所有平台
npm run build:all
```

**打包产物示例**：
- Windows: `MQTT设备模拟器-1.0.0-20251201135545-win-x64.exe`
- macOS: `MQTT设备模拟器-1.0.0-20251201135545-mac-universal.dmg`
- Linux: `MQTT设备模拟器-1.0.0-20251201135545-linux-x64.AppImage`

## 🎮 使用指南

### 基础模式
1. 配置 MQTT Broker（主机、端口、主题）
2. 设置设备范围（起始编号、结束编号）
3. 配置凭证前缀（设备名、ClientID、用户名、密码）
4. 选择数据格式和数据点数量
5. 可选：添加自定义Key
6. 点击"启动"开始模拟

### 高级模式
1. 添加分组（最多10个）
2. 为每个分组配置：
   - 设备范围
   - 独立的凭证前缀
   - Key数量和类型占比
   - 全量上报间隔
   - 变化上报间隔和比例
3. 可选：为每个分组添加自定义Key
4. 点击"启动"开始模拟

### 日志搜索
- 在搜索框输入关键词（设备ID、消息内容）
- 自动过滤和高亮显示匹配项
- 搜索时自动显示JSON数据详情

### 配置管理
- **导出配置**：点击"导出配置"保存当前设置为JSON文件
- **导入配置**：点击"导入配置"加载之前保存的设置

## 📂 项目结构

```
mqtt-electron-simulator/
├── src/
│   ├── main/                   # 主进程
│   │   ├── index.js           # 主进程入口
│   │   ├── preload.js         # Context Bridge
│   │   └── services/          # 后端服务
│   │       ├── mqtt-controller.js    # MQTT控制器
│   │       ├── data-generator.js     # 数据生成器
│   │       └── schema-generator.js   # Schema生成器
│   └── renderer/               # 渲染进程
│       ├── index.html         # UI界面
│       ├── style.css          # 样式
│       └── js/                # ES6模块化JavaScript
│           ├── app.js         # 应用主入口
│           ├── ui/            # UI组件
│           ├── services/      # 前端服务
│           ├── utils/         # 工具函数
│           └── constants/     # 常量定义
├── resources/                  # 静态资源
│   ├── config/                # 默认配置
│   └── icons/                 # 应用图标
├── scripts/                    # 构建脚本
│   ├── generate-ico.js        # 图标生成
│   └── update-version-timestamp.js  # 版本号时间戳
├── docs/                       # 文档
│   └── design.md              # 设计文档
├── package.json               # 项目配置
└── README.md                  # 项目说明
```

## 🛠️ 技术栈

- **框架**：Electron 28.3.3
- **语言**：JavaScript (ES6 Modules)
- **MQTT客户端**：mqtt.js 5.13.1
- **配置解析**：js-yaml 4.1.0
- **打包工具**：electron-builder 24.13.3
- **图标转换**：to-ico 1.1.5

## 🔧 高级配置

### NSIS 安装程序配置
Windows 打包使用 NSIS，支持：
- ✅ 自定义安装路径
- ✅ 桌面快捷方式
- ✅ 开始菜单快捷方式
- ✅ 完整的卸载支持

### 性能参数
- **最大DOM日志**：500条
- **内存存储日志**：1000条
- **日志采样比例**：1/10（每10次记录1次）
- **最大分组数**：10个

## 📝 许可证

ISC

## 👤 作者

yannan.chen

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📚 相关文档

- [设计文档](docs/design.md) - 详细的技术架构和设计决策
- [Electron 官方文档](https://www.electronjs.org/docs)
- [MQTT.js 文档](https://github.com/mqttjs/MQTT.js)