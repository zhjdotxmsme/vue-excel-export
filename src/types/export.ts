import type { ColumnConfig } from './column'
import type { CellStyle } from './style'

/** 导出选项 */
export interface ExportOptions {
  /** 列配置 */
  columns: ColumnConfig[]
  /** JSON 数据 */
  data: Record<string, unknown>[]
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
}
