/**
 * SFTP 文件管理器类型定义
 */

// 数据源类型
export type SourceType = 'local' | 'remote'

// 数据源配置
export interface DataSource {
  type: SourceType
  connectionId?: string  // 远程连接时的连接ID
  label: string          // 显示标签，如 "本地" 或 "user@host"
}

// 文件条目
export interface FileItem {
  name: string
  path: string           // 完整路径
  type: 'file' | 'directory'
  size: number           // 字节数，目录为 0
  modifiedTime: number   // 时间戳
  permissions?: string   // 如 "rwxr-xr-x"（仅远程）
}

// 面板状态
export interface PanelState {
  source: DataSource
  currentPath: string
  files: FileItem[]
  selectedFiles: Set<string>  // 选中的文件路径集合
  isLoading: boolean
  error: string | null
  lastSelectedIndex: number | null  // 用于 Shift 选择
}

// SSH 连接配置（复用现有）
export interface SSHConnectionConfig {
  host: string
  port: number
  username: string
  authType: 'password' | 'key'
  password?: string
  keyPath?: string
  keyText?: string
  keyMode?: 'file' | 'text'
  name?: string
  saveToHistory?: boolean
}

// 传输进度
export interface TransferProgress {
  fileName: string
  currentFile: number
  totalFiles: number
  bytesTransferred: number
  totalBytes: number
  percent: number
  status: 'pending' | 'transferring' | 'completed' | 'failed'
  error?: string
}

// 传输任务
export interface TransferTask {
  id: string
  sourceType: SourceType
  sourcePath: string
  destType: SourceType
  destPath: string
  files: string[]
  progress: TransferProgress
}

// 文件冲突处理选项
export type ConflictAction = 'overwrite' | 'skip' | 'rename'

// 文件操作结果
export interface FileOperationResult {
  success: boolean
  error?: string
  data?: any
}

// 连接信息
export interface ConnectionInfo {
  connectionId: string
  label: string
  host: string
  username: string
}

// 默认本地数据源
export const DEFAULT_LOCAL_SOURCE: DataSource = {
  type: 'local',
  label: '本地'
}

// 获取默认路径
export function getDefaultPath(type: SourceType): string {
  if (type === 'local') {
    // Windows 默认到用户目录，其他系统到根目录
    return process.platform === 'win32' ? 'C:/' : '/'
  }
  return '/'
}

// 格式化文件大小
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '-'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`
}

// 格式化时间
export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${year}/${month}/${day} ${hour}:${minute}`
}

// 获取文件图标
export function getFileIcon(item: FileItem): string {
  if (item.type === 'directory') {
    return 'i-mdi-folder'
  }
  
  const ext = item.name.split('.').pop()?.toLowerCase() || ''
  const iconMap: Record<string, string> = {
    // 文档
    txt: 'i-mdi-file-document',
    md: 'i-mdi-language-markdown',
    pdf: 'i-mdi-file-pdf-box',
    doc: 'i-mdi-file-word',
    docx: 'i-mdi-file-word',
    xls: 'i-mdi-file-excel',
    xlsx: 'i-mdi-file-excel',
    ppt: 'i-mdi-file-powerpoint',
    pptx: 'i-mdi-file-powerpoint',
    // 代码
    js: 'i-mdi-language-javascript',
    ts: 'i-mdi-language-typescript',
    vue: 'i-mdi-vuejs',
    html: 'i-mdi-language-html5',
    css: 'i-mdi-language-css3',
    json: 'i-mdi-code-json',
    xml: 'i-mdi-file-xml-box',
    java: 'i-mdi-language-java',
    py: 'i-mdi-language-python',
    sh: 'i-mdi-console',
    // 图片
    jpg: 'i-mdi-file-image',
    jpeg: 'i-mdi-file-image',
    png: 'i-mdi-file-image',
    gif: 'i-mdi-file-image',
    svg: 'i-mdi-file-image',
    webp: 'i-mdi-file-image',
    // 压缩包
    zip: 'i-mdi-folder-zip',
    rar: 'i-mdi-folder-zip',
    '7z': 'i-mdi-folder-zip',
    tar: 'i-mdi-folder-zip',
    gz: 'i-mdi-folder-zip',
    // 其他
    exe: 'i-mdi-application',
    apk: 'i-mdi-android',
    jar: 'i-mdi-language-java',
    log: 'i-mdi-file-document-outline',
    sql: 'i-mdi-database',
    yml: 'i-mdi-file-cog',
    yaml: 'i-mdi-file-cog',
  }
  
  return iconMap[ext] || 'i-mdi-file'
}

// 路径工具函数
export function joinPath(...parts: string[]): string {
  // 处理 Windows 和 Unix 路径
  const joined = parts
    .filter(p => p)
    .join('/')
    .replace(/\/+/g, '/')
  
  // 保留 Windows 盘符
  if (/^[A-Za-z]:/.test(parts[0])) {
    return joined.replace(/^([A-Za-z]):\//, '$1:/')
  }
  
  return joined
}

export function getParentPath(path: string): string {
  // 处理根目录
  if (path === '/' || /^[A-Za-z]:\/?$/.test(path)) {
    return path
  }
  
  const parts = path.replace(/\/$/, '').split('/')
  parts.pop()
  
  if (parts.length === 0) return '/'
  if (parts.length === 1 && /^[A-Za-z]:$/.test(parts[0])) {
    return parts[0] + '/'
  }
  
  return parts.join('/') || '/'
}

export function getFileName(path: string): string {
  return path.split('/').filter(p => p).pop() || ''
}
