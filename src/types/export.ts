import type { ColumnConfig } from './column'
import type { CellStyle } from './style'

/** 分页配置 */
export interface PaginationConfig {
  /** 每页记录数（默认 500） */
  pageSize: number
  /** 分页数据获取回调 */
  fetch: (page: number, pageSize: number) => Promise<PaginationResult>
}

/** 分页获取结果 */
export interface PaginationResult {
  /** 当前页数据 */
  data: Record<string, unknown>[]
  /** 总记录数 */
  total: number
}

/** 导出进度 */
export interface ExportProgress {
  /** 当前页码（从 1 开始） */
  page: number
  /** 总页数 */
  totalPages: number
  /** 已获取记录数 */
  fetched: number
  /** 总记录数 */
  total: number
}

/** 导出选项 */
export interface ExportOptions {
  /** 列配置 */
  columns: ColumnConfig[]
  /** JSON 数据（与 pagination 互斥，pagination 优先） */
  data?: Record<string, unknown>[]
  /** 分页配置（与 data 互斥） */
  pagination?: PaginationConfig
  /** 导出文件名（默认 'export.xlsx'） */
  filename?: string
  /** Sheet 名称（默认 'Sheet1'） */
  sheetName?: string
  /** 全局表头样式覆盖 */
  headerStyle?: Partial<CellStyle>
  /** 全局数据格样式覆盖 */
  cellStyle?: Partial<CellStyle>
  /** 自动列宽（默认 true） */
  autoColumnWidth?: boolean
  /** 导出进度回调（分页模式生效） */
  onProgress?: (progress: ExportProgress) => void
}
