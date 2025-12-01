# 设计文档 - MQTT 设备模拟器

本文档阐述 MQTT 设备模拟器的技术架构、设计决策和实现细节。

## 1. 架构概览

### 1.1 Electron 进程模型

本项目遵循 Electron 标准的**主进程-渲染进程**分离架构：

- **主进程** (`src/main/index.js`)
  - 创建和管理应用窗口
  - 处理应用生命周期
  - 运行 MQTT 模拟核心逻辑
  - 通过 IPC 接收渲染进程命令
  - 推送日志和状态更新到渲染进程

- **渲染进程** (`src/renderer/`)
  - 渲染用户界面 (HTML/CSS)
  - 处理用户交互 (ES6 模块化 JavaScript)
  - 通过 `preload.js` 暴露的安全 API 与主进程通信
  - 实时显示日志和状态

- **预加载脚本** (`src/main/preload.js`)
  - 使用 `contextBridge` 安全地暴露 IPC 通道
  - 隔离渲染进程和 Node.js API，提高安全性

## 2. 模块化设计

### 2.1 主进程模块

```
src/main/
├── index.js                    # 主进程入口，窗口管理，IPC处理
├── preload.js                  # Context Bridge，IPC API暴露
└── services/
    ├── mqtt-controller.js      # MQTT模拟控制器
    ├── data-generator.js       # 数据生成器
    └── schema-generator.js     # Schema生成器（高级模式）
```

#### MqttController
- **职责**：管理所有 MQTT 客户端和模拟任务
- **核心方法**：
  - `start(config, logCallback)`: 启动模拟（基础/高级模式）
  - `stop()`: 停止所有模拟
  - `createClient()`: 创建单个设备客户端
- **特性**：
  - 自动凭证生成（支持零填充）
  - 日志采样（减少90%日志量）
  - 定时器管理

#### DataGenerator
- **职责**：生成模拟数据
- **支持格式**：
  - `default`: 电池状态数据
  - `tn`: ThingsBoard格式
  - `tn-empty`: ThingsBoard空值格式
- **特性**：支持自定义Key、类型比例

### 2.2 渲染进程模块（ES6）

```
src/renderer/
├── index.html                  # UI界面
├── style.css                   # 样式
└── js/
    ├── app.js                  # 应用主入口
    ├── ui/
    │   ├── logger-ui.js        # 日志显示组件
    │   ├── tabs.js             # 标签页管理
    │   ├── groups.js           # 分组管理（高级模式）
    │   └── custom-keys.js      # 自定义Key管理
    ├── services/
    │   └── config-service.js   # 配置导入/导出
    ├── utils/
    │   └── dom-helpers.js      # DOM工具函数
    └── constants/
        └── ui-constants.js     # UI常量
```

**模块化优势**：
- 代码职责清晰
- 易于测试和维护
- 支持代码复用

## 3. 核心功能设计

### 3.1 双模式支持

#### 基础模式
- 统一配置所有设备
- 简单快速
- 适合测试场景

#### 高级模式
- 分组管理（最多10组）
- 每组独立配置：
  - 设备范围
  - 凭证前缀
  - 数据点数量
  - 全量/变化上报间隔
  - 类型占比
- 灵活性强，适合复杂场景

### 3.2 日志系统优化

#### 内存管理
- **DOM元素限制**：最多保留500条日志
- **存储限制**：内存中保留1000条历史
- **日志采样**：每10次成功发送记录1次（减少90%）

#### 搜索与过滤
- 实时搜索（设备ID、消息内容）
- 高亮显示匹配项
- 过滤状态提示

#### JSON数据展示
- 条件显示：仅在搜索时显示JSON数据
- 可折叠：默认限高120px
- 复制功能：一键复制完整JSON

### 3.3 配置管理

#### 导入/导出
- 导出当前配置为JSON
- 导入已保存配置
- 保留版本号，便于兼容性管理

#### 配置面板锁定
- 模拟运行时自动锁定所有输入
- 防止误操作
- 视觉反馈（🔒 模拟运行中）

### 3.4 凭证生成

- **自动零填充**：固定2位（如 `c01`, `c09`, `c10`）
- **独立前缀**：设备名、ClientID、用户名、密码
- **范围支持**：灵活的起始/结束编号

## 4. 性能优化

### 4.1 内存泄漏修复
- DOM元素自动清理
- 日志采样降低IPC压力
- 数据载荷优化

### 4.2 打包优化
- 跨平台图标支持（.icns, .ico, .png）
- NSIS配置（可选安装路径、桌面快捷方式）
- 自动时间戳版本号

## 5. 数据流

### 启动模拟流程
1. 用户点击"启动"按钮
2. `app.js` 收集配置，调用 `window.api.startSimulation(config)`
3. `preload.js` 转发到主进程 `ipcMain.handle('start-simulation')`
4. `MqttController.start()` 创建设备客户端
5. 客户端连接并启动定时器
6. 日志通过 `mqtt-log` IPC 事件回传到渲染进程
7. `LoggerUI` 接收并显示日志（带DOM限制）

### 配置导入流程
1. 用户点击"导入配置"
2. 主进程显示文件对话框
3. 确认后读取JSON文件
4. `ConfigService.fillConfigToUI()` 填充UI
5. 重建分组、自定义Key
6. 切换到对应模式

## 6. 技术栈

- **框架**：Electron 28.3.3
- **语言**：JavaScript (ES6 Modules)
- **MQTT**：mqtt.js 5.13.1
- **配置**：js-yaml 4.1.0
- **构建**：electron-builder 24.13.3
- **图标工具**：to-ico 1.1.5

## 7. 设计原则

1. **关注点分离**：主进程处理业务逻辑，渲染进程专注UI
2. **模块化**：单一职责，高内聚低耦合
3. **性能优先**：DOM限制、日志采样、异步处理
4. **用户体验**：实时反馈、锁定保护、搜索过滤
5. **可维护性**：清晰的目录结构、完善的注释