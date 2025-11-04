# keyboardLight 程序设计说明与使用指南

## 概述
keyboardLight 是一个在屏幕上高亮显示你当前按下按键的桌面工具。它通过全局键盘监听捕获按键事件，为常用字母、数字与符号生成标签并在覆盖层中高亮显示，适合录屏、直播、演示等场景。

- 平台：Windows（x64）
- 技术栈：Electron、uiohook-napi、HTML/CSS/JS

## 主要特性
- 全局键盘捕获：无需聚焦应用即可捕获按键。
- 即时高亮显示：覆盖层始终置顶显示按键标签（如 WASD、数字、符号）。
- 自定义映射修复：主进程对键码到标签的反向映射进行了兼容处理，避免空标签导致不高亮。
- 无干扰使用：默认不打开 DevTools（设置 `ELECTRON_DEVTOOLS=1` 时可开启）。
- 任务栏行为优化：最小化后显示到任务栏，恢复时继续作为覆盖层隐藏任务栏图标。
- 可打包发布：内置 `electron-builder` 配置，可一键生成安装包或便携版。

## 架构设计
- 主进程（`index.js`）
  - 初始化 `BrowserWindow` 覆盖层窗口（始终置顶、可穿透点击区域）。
  - 通过 `uiohook-napi` 捕获全局按键；反向解析枚举并生成非空标签。
  - 通过 IPC 将按键事件转发到渲染层；处理最小化与关闭请求，使用 `BrowserWindow.fromWebContents(event.sender)` 精确定位窗口。
  - 根据窗口状态调用 `setSkipTaskbar(false|true)` 控制任务栏显示/隐藏。
- 预加载（`preload.js`）
  - 安全桥接 IPC，监听主进程事件并传入浏览器上下文。
- 渲染层（`src/main.html`）
  - 构建覆盖层 UI 与按键网格；接收事件后为匹配元素添加 `.active` 高亮。
  - 标题栏按钮添加 `-webkit-app-region: no-drag`，确保可点击（避免被拖拽区域拦截）。

## 安装与运行（开发）
1. 安装依赖：
   - 安装 Node.js（推荐 18+）与 npm。
   - 在项目根目录执行：
     ```powershell
     npm install
     ```
2. 运行开发模式：
   - 默认不打开开发者工具：
     ```powershell
     npm run start
     ```
   - 如需调试（打开 DevTools）：
     ```powershell
     $env:ELECTRON_DEVTOOLS=1; npm run start
     ```
3. 预览页面：
   - 覆盖层加载 `http://127.0.0.1:8080/main.html`（项目内置静态服务）。

## 打包发布（Windows）
项目已集成 `electron-builder`：
- 安装依赖已完成（`electron-builder` 位于 `devDependencies`，`electron` 也位于 `devDependencies`）。
- 打包前建议准备：
  - Windows 10/11 x64；
  - 可选：安装 Visual C++ Build Tools（含“使用 C++ 的桌面开发”），以及 Python 3（用于原生依赖重建）。

执行打包：
- 生成安装包（NSIS）：
  ```powershell
  npm run dist
  ```
  输出目录：`dist/`，文件名形如 `keyboardLight-1.0.0-Setup.exe`。
- 生成便携版（Portable）：
  ```powershell
  npm run dist:portable
  ```

若网络缓慢导致 Electron 下载失败，可设置国内镜像后重试：
```powershell
$env:ELECTRON_MIRROR="https://registry.npmmirror.com/-/binary/electron/"; npm run dist
```
或多次重试，`electron-builder` 会自动断点续传。

## 使用指南
- 启动后，覆盖层会始终置顶显示；在任意应用中按下按键，即可在覆盖层看到对应的高亮。
- 标题栏按钮：
  - 最小化：将窗口最小化并显示到任务栏；
  - 关闭：退出应用。
- 调试：如需查看事件日志与渲染状态，可按“安装与运行”中的方式开启 DevTools。

## 常见问题排查
- 按键不高亮：
  - 观察主进程日志是否出现 `unknown keycode` 警告；
  - 检查 IPC 是否到达渲染层；
  - 检查覆盖层元素选择器是否能匹配生成的 `label`。
- 最小化后不显示任务栏：
  - 已在主进程通过 `minimize`/`restore` 事件和 IPC 前置调用修复；如仍异常，请确认系统任务栏设置与第三方桌面管理工具是否拦截。
- 打包失败（Electron ZIP 无效或下载失败）：
  - 设置 `ELECTRON_MIRROR` 环境变量后重试；
  - 清理缓存目录后重试：删除 `node_modules/.cache` 与 `dist/`。

## 目录结构
- `index.js`：主进程入口，窗口与全局键监听、IPC、任务栏逻辑。
- `preload.js`：预加载脚本，桥接主进程与渲染器。
- `src/main.html`：覆盖层页面与样式、交互逻辑。
- `package.json`：脚本与打包配置（`build` 字段），`asarUnpack` 以支持 `*.node` 原生模块。

## 许可证
- ISC（见 `package.json`）。
