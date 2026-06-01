/** 单元格样式 */
export interface CellStyle {
  bold?: boolean
  italic?: boolean
  fontSize?: number
  fontColor?: string
  fontName?: string
  bgColor?: string
  align?: 'left' | 'center' | 'right'
  verticalAlign?: 'top' | 'middle' | 'bottom'
  border?: CellBorder
}

export interface CellBorder {
  top?: boolean | BorderStyleItem
  bottom?: boolean | BorderStyleItem
  left?: boolean | BorderStyleItem
  right?: boolean | BorderStyleItem
}

export interface BorderStyleItem {
  color: string
  style: 'thin' | 'medium' | 'thick'
}

/** 合并规则 */
export type MergeRule =
  | { type: 'value' }
  | { type: 'always' }
  | { type: 'custom'; when: (current: unknown, next: unknown, rowIndex: number) => boolean }

/** 合并范围 */
export interface MergeRange {
  startRow: number
  startCol: number
  endRow: number
  endCol: number
}
