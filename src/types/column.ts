import type { CellStyle, MergeRule } from './style'

/** 叶子列 —— 对应数据字段 */
export interface LeafColumn {
  title: string
  field: string
  width?: number
  align?: 'left' | 'center' | 'right'
  style?: Partial<CellStyle>
  merge?: MergeRule
}

/** 分组列 —— 包含子列 */
export interface GroupColumn {
  title: string
  children: ColumnConfig[]
  align?: 'left' | 'center' | 'right'
  style?: Partial<CellStyle>
}

export type ColumnConfig = LeafColumn | GroupColumn

/** 内部扁平化后的列信息 */
export interface FlatColumn {
  title: string
  field: string
  colIndex: number        // 0-based Excel 列号
  rowIndex: number        // 表头层级行号
  depth: number           // 该叶子列的总嵌套深度
  parentTitle?: string    // 所属分组标题
  width?: number
  align?: 'left' | 'center' | 'right'
  style?: Partial<CellStyle>
  merge?: MergeRule
}

/** 表头层级信息 */
export interface HeaderInfo {
  flatColumns: FlatColumn[]
  headerDepth: number
  headerRanges: HeaderMergeRange[]
}

/** 表头合并范围 */
export interface HeaderMergeRange {
  title: string
  startRow: number
  startCol: number
  endRow: number
  endCol: number
  style?: Partial<CellStyle>
  align?: 'left' | 'center' | 'right'
}
