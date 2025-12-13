# 设计文档 - IoT DevKit

本文档阐述 IoT DevKit （物联网开发工具箱）的技术架构、设计决策和实现细节。

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
    ├── app.js                  # 应用主入口，面板切换管理
    ├── ui/
    │   ├── logger-ui.js        # 日志显示组件
    │   ├── tabs.js             # 标签页管理
    │   ├── groups.js           # 分组管理（高级模式）
    │   ├── custom-keys.js      # 自定义Key管理
    │   ├── timestamp-tool.js   # ⭐ 时间戳转换工具
    │   └── statistics-ui.js    # 统计面板
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

#### TimestampTool (新增)
- **职责**：时间戳与日期时间的双向转换
- **核心功能**：
  - 实时当前时间显示（每秒更新）
  - 时间戳转日期（支持秒级/毫秒级自动识别）
  - 日期转时间戳（智能解析多种格式）
  - 多时区支持（12个常用时区）
  - 一键复制功能
- **性能优化**：
  - 懒加载：仅在激活时启动 `setInterval`
  - 资源释放：切换离开时立即 `clearInterval`
  - 零依赖：使用原生 `Intl.DateTimeFormat` API

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

### 3.4 时间戳工具 (新增)

#### 功能模块
1. **当前时间显示**
   - 实时更新（每秒刷新）
   - 同时显示日期时间和时间戳
   - 支持复制日期时间和时间戳

2. **时间戳 → 日期**
   - 自动识别输入格式（10位秒级 / 13位毫秒级）
   - 多时区支持（12个常用时区）
   - 使用 `Intl.DateTimeFormat` 处理时区转换
   - 实时转换（input 事件监听）
   - 错误处理和提示

3. **日期 → 时间戳**
   - 智能解析多种日期格式：
     - `2025-12-13 21:00:00`
     - `2025/12/13 21:00:00`
     - `2025-12-13T21:00:00`
   - 支持直接粘贴时间字符串
   - 时区调整计算
   - 输出毫秒级时间戳

#### 技术实现
- **时区列表**：12个预定义时区（UTC、北京、东京、纽约等）
- **解析策略**：
  1. 尝试 `new Date()` 直接解析
  2. 规范化分隔符（`/` → `-`）
  3. 添加 `T` 分隔符重试
- **性能优化**：
  - 定时器懒加载：仅在面板激活时创建
  - 自动清理：面板切换时销毁定时器
- **剪贴板API**：
  - 优先使用 `navigator.clipboard.writeText()`
  - 降级方案：`document.execCommand('copy')`

### 3.5 多面板架构 (新增)

#### 面板切换机制
- **顶层导航**：`📊 数据模拟` | `🕐 时间转换`
- **面板管理**：
  - `currentPanel` 状态追踪
  - CSS class 控制显示/隐藏（`.active`）
  - 面板独立性：互不干扰
- **生命周期管理**：
  ```javascript
  switchPanel(panelName) {
    // 1. 停止旧面板资源（如 TimestampTool）
    if (currentPanel === 'timestamp') timestampTool.stop();
    
    // 2. 切换视图
    // 3. 启动新面板资源
    if (panelName === 'timestamp') timestampTool.start();
  }
  ```

### 3.6 凭证生成

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

### 面板切换流程 (新增)
1. 用户点击顶层导航按钮（数据模拟/时间转换）
2. `app.js` 中 `switchPanel(panelName)` 被调用
3. 检查当前面板，释放资源：
   - 如果离开时间戳面板：`timestampTool.stop()` → 清除定时器
4. 隐藏所有面板，移除所有导航按钮的 `.active`
5. 显示目标面板，激活对应导航按钮
6. 初始化目标面板资源：
   - 如果进入时间戳面板：`timestampTool.start()` → 启动定时器
7. 更新 `currentPanel` 状态

### 时间戳转换流程 (新增)
**实时当前时间**：
1. 面板激活时调用 `timestampTool.start()`
2. 创建 `setInterval`，每秒执行 `updateCurrentTime()`
3. 更新 DOM：`current-date`, `current-time`, `current-timestamp`
4. 面板切换时调用 `stop()`，清除定时器

**时间戳转日期**：
1. 用户在输入框输入时间戳
2. `input` 事件触发 `convertTimestampToDate()`
3. 调用 `parseTimestamp()` 判断秒级/毫秒级
4. 使用 `Intl.DateTimeFormat` 转换为选定时区的日期时间
5. 显示结果，支持复制

**日期转时间戳**：
1. 用户粘贴或输入日期时间字符串
2. `input` 事件触发 `convertDateToTimestamp()`
3. 调用 `parseFlexibleDateTime()` 智能解析
4. 计算时区偏移，生成毫秒时间戳
5. 显示结果，支持复制

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
3. **性能优先**：DOM限制、日志采样、异步处理、懒加载
4. **用户体验**：实时反馈、锁定保护、搜索过滤、多面板切换
5. **可维护性**：清晰的目录结构、完善的注释
6. **资源管理**：面板切换时自动释放资源（定时器、事件监听器）
7. **工具集理念**：独立功能模块（MQTT模拟、时间转换），互不干扰