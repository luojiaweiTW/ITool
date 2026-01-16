# Implementation Plan: SFTP File Manager

## Overview

基于设计文档，将 SFTP 文件管理器功能分解为可执行的开发任务。采用增量开发方式，先实现核心框架，再逐步添加功能。

## Tasks

- [-] 1. 项目结构和基础组件
  - [-] 1.1 创建工具目录结构和路由配置
    - [x] 创建 `src/pages/tools/FileTransfer/` 目录
    - [ ] 创建 `Index.vue` 主组件骨架（双面板布局）
    - [x] 创建 `types.ts` 类型定义文件
    - [ ] 在 `src/router/index.ts` 添加路由
    - _Requirements: 1.1_

  - [ ] 1.2 实现 FilePanel 组件框架
    - 创建 `components/FilePanel.vue`
    - 实现基础布局（头部、文件列表区、状态栏）
    - 定义 props: source, currentPath, files, selectedFiles
    - 定义 emits: navigate, select, refresh
    - _Requirements: 1.1, 3.1_

  - [ ] 1.3 实现 SourceSelector 组件
    - 创建 `components/SourceSelector.vue`
    - 实现本地/远程切换下拉框
    - 远程模式显示已连接服务器列表
    - _Requirements: 1.3, 2.1, 2.2_

- [ ] 2. Electron 主进程文件操作 API
  - [ ] 2.1 实现本地文件系统操作
    - 在 `electron-main.cjs` 添加 `fileTransfer:` IPC 处理器
    - 实现 `listDir` - 列出目录内容
    - 实现 `deleteFiles` - 删除文件/文件夹
    - 实现 `renameFile` - 重命名
    - 实现 `createDir` - 创建文件夹
    - _Requirements: 3.2, 6.2, 7.2, 8.1_

  - [ ] 2.2 实现 SFTP 连接管理
    - 创建 ConnectionManager 类管理多个 SSH 连接
    - 实现 `connect` - 建立 SSH/SFTP 连接
    - 实现 `disconnect` - 断开连接
    - 实现 `getConnections` - 获取活动连接列表
    - 复用现有 SSH 历史记录
    - _Requirements: 2.4, 9.1, 9.4_

  - [ ] 2.3 实现 SFTP 文件操作
    - 实现 SFTP 版本的 `listDir`
    - 实现 SFTP 版本的 `deleteFiles`
    - 实现 SFTP 版本的 `renameFile`
    - 实现 SFTP 版本的 `createDir`
    - _Requirements: 3.2, 6.2, 7.2, 8.1_

  - [ ] 2.4 更新 Preload 脚本暴露 API
    - 在 `electron-preload.cjs` 添加 `fileTransfer` 命名空间
    - 暴露所有文件操作方法
    - 添加进度事件监听器
    - _Requirements: 5.3_

- [ ] 3. 文件浏览功能
  - [ ] 3.1 实现 PathBreadcrumb 组件
    - 创建 `components/PathBreadcrumb.vue`
    - 显示当前路径的面包屑导航
    - 支持点击路径段快速跳转
    - 支持输入路径直接导航
    - _Requirements: 3.4, 3.5_

  - [ ] 3.2 实现 FileList 组件
    - 创建 `components/FileList.vue`
    - 显示文件列表（名称、大小、修改时间、类型）
    - 文件夹显示文件夹图标，文件显示对应图标
    - 显示 ".." 返回上级目录
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ] 3.3 实现目录导航逻辑
    - 点击文件夹进入子目录
    - 点击 ".." 返回上级目录
    - 加载状态显示
    - 错误处理和重试
    - _Requirements: 3.2, 3.3, 3.6, 3.7_

  - [ ] 3.4 编写导航属性测试
    - **Property 1: Navigation Consistency**
    - 测试各种导航操作后路径和文件列表的一致性
    - **Validates: Requirements 3.2, 3.3, 3.5**

- [ ] 4. 文件选择功能
  - [ ] 4.1 实现单选和多选逻辑
    - 单击选中单个文件
    - Ctrl+单击切换选中状态
    - 在 FilePanel 中管理 selectedFiles 状态
    - _Requirements: 4.1, 4.2_

  - [ ] 4.2 实现范围选择逻辑
    - 记录最后选中的文件索引
    - Shift+单击选中范围内所有文件
    - _Requirements: 4.3_

  - [ ] 4.3 实现选择状态 UI
    - 选中文件高亮显示
    - 状态栏显示选中数量
    - 点击空白区域清除选择
    - _Requirements: 4.1, 4.4, 4.5_

  - [ ] 4.4 编写选择属性测试
    - **Property 2: Selection State Management**
    - **Property 3: Range Selection**
    - 测试各种选择操作后 selectedFiles 的正确性
    - **Validates: Requirements 4.1, 4.2, 4.3**

- [ ] 5. Checkpoint - 基础功能验收
  - 确保文件浏览、导航、选择功能正常工作
  - 确保本地和远程数据源都能正常切换
  - 确保所有测试通过，如有问题请询问用户

- [ ] 6. 文件传输功能
  - [ ] 6.1 实现 TransferButtons 组件
    - 创建 `components/TransferButtons.vue`
    - 左右箭头按钮（复制到左/右）
    - 按钮禁用状态（无选中文件时）
    - _Requirements: 5.1, 5.2_

  - [ ] 6.2 实现文件复制逻辑（主进程）
    - 实现 `copyFiles` IPC 处理器
    - 支持本地→本地、本地→远程、远程→本地、远程→远程
    - 递归复制文件夹
    - 发送进度事件
    - _Requirements: 5.1, 5.2, 5.4_

  - [ ] 6.3 实现 ProgressOverlay 组件
    - 创建 `components/ProgressOverlay.vue`
    - 显示当前传输文件名
    - 显示进度条和百分比
    - 显示已传输/总大小
    - _Requirements: 5.3_

  - [ ] 6.4 实现文件冲突处理
    - 检测目标文件是否存在
    - 弹出对话框：覆盖/跳过/重命名
    - 应用用户选择
    - _Requirements: 5.5_

  - [ ] 6.5 编写复制操作属性测试
    - **Property 4: Copy Operation Correctness**
    - 使用 mock 文件系统测试复制结果
    - **Validates: Requirements 5.1, 5.2, 5.4**

- [ ] 7. 文件管理功能
  - [ ] 7.1 实现删除功能
    - 删除按钮和确认对话框
    - 调用 deleteFiles API
    - 刷新面板显示
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ] 7.2 实现重命名功能
    - F2 快捷键或右键菜单触发
    - 内联编辑器组件
    - 名称冲突检测
    - ESC 取消编辑
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ] 7.3 实现新建文件夹功能
    - 新建文件夹按钮
    - 创建后自动进入重命名模式
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ] 7.4 编写删除和重命名属性测试
    - **Property 5: Delete Operation Correctness**
    - **Property 6: Rename Operation Correctness**
    - **Validates: Requirements 6.2, 6.3, 7.2**

- [ ] 8. 右键菜单和连接管理
  - [ ] 8.1 实现右键上下文菜单
    - 文件上右键：复制、删除、重命名
    - 空白区域右键：刷新、新建文件夹
    - _Requirements: 10.1, 10.2, 10.3_

  - [ ] 8.2 实现 ConnectionDialog 组件
    - 创建 `components/ConnectionDialog.vue`
    - 复用 SSH 工具的连接表单
    - 支持从历史记录选择
    - 支持新建连接
    - _Requirements: 9.2, 9.3, 9.4_

  - [ ] 8.3 实现连接状态管理
    - 连接断开检测
    - 断开后显示重连提示
    - 自动重连选项
    - _Requirements: 9.5_

- [ ] 9. Final Checkpoint - 完整功能验收
  - 确保所有功能正常工作
  - 确保所有测试通过
  - 确保错误处理完善
  - 如有问题请询问用户

## Notes

- 所有任务都是必需的，包括属性测试
- 每个任务引用了对应的需求编号便于追溯
- Checkpoint 任务用于阶段性验收
- 属性测试使用 fast-check 库，每个测试运行 100 次迭代
