import type {
  ColumnConfig,
  FlatColumn,
  HeaderInfo,
  HeaderMergeRange,
  LeafColumn,
  GroupColumn,
} from '../types/column'

function isLeafColumn(col: ColumnConfig): col is LeafColumn {
  return 'field' in col && typeof col.field === 'string'
}

function calcMaxDepth(columns: ColumnConfig[], currentDepth: number): number {
  let max = currentDepth
  for (const col of columns) {
    if (isLeafColumn(col)) {
      max = Math.max(max, currentDepth)
    } else {
      max = Math.max(max, calcMaxDepth((col as GroupColumn).children, currentDepth + 1))
    }
  }
  return max
}

/**
 * 递归展开 ColumnConfig：
 * - flatColumns: 只包含叶子列，全部放在最后一行 (maxDepth-1)
 * - headerRanges: 包含所有表头文字的位置信息
 */
function flatten(
  columns: ColumnConfig[],
  parentTitle: string | undefined,
  startCol: number,
  currentDepth: number,
  maxDepth: number,
  result: FlatColumn[],
  ranges: HeaderMergeRange[],
): number {
  let col = startCol

  for (const config of columns) {
    if (isLeafColumn(config)) {
      result.push({
        title: config.title,
        field: config.field,
        colIndex: col,
        rowIndex: maxDepth - 1,
        depth: maxDepth,
        parentTitle,
        width: config.width,
        align: config.align,
        style: config.style,
        merge: config.merge,
      })
      if (currentDepth < maxDepth - 1) {
        ranges.push({
          title: config.title,
          startRow: currentDepth,
          startCol: col,
          endRow: maxDepth - 2,
          endCol: col,
          style: config.style,
          align: config.align,
        })
      }
      col++
    } else {
      const group = config as GroupColumn
      const start = col
      col = flatten(group.children, group.title, start, currentDepth + 1, maxDepth, result, ranges)

      const end = col - 1
      if (end >= start) {
        ranges.push({
          title: group.title,
          startRow: currentDepth,
          startCol: start,
          endRow: currentDepth,
          endCol: end,
          style: group.style,
          align: group.align,
        })
      }
    }
  }

  return col
}

/**
 * 解析多级表头配置
 */
export function parseHeaders(columns: ColumnConfig[]): HeaderInfo {
  const maxDepth = calcMaxDepth(columns, 1)
  const flatColumns: FlatColumn[] = []
  const headerRanges: HeaderMergeRange[] = []

  flatten(columns, undefined, 0, 0, maxDepth, flatColumns, headerRanges)

  const seen = new Set<string>()
  const uniqueRanges = headerRanges.filter((r) => {
    const key = `${r.startRow},${r.startCol},${r.endRow},${r.endCol}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return { flatColumns, headerDepth: maxDepth, headerRanges: uniqueRanges }
}

/**
 * 从 headerRanges + flatColumns 构建表头文字网格
 */
export function buildHeaderGrid(info: HeaderInfo): string[][] {
  const { headerDepth, headerRanges, flatColumns } = info
  const totalCols = flatColumns.length
  const grid: string[][] = Array.from({ length: headerDepth }, () =>
    Array.from({ length: totalCols }, () => ''),
  )

  for (const hr of headerRanges) {
    if (grid[hr.startRow]) {
      grid[hr.startRow][hr.startCol] = hr.title
    }
  }

  // 最底层叶子列标题，跳过已通过 headerRange 在非底层放置过的列
  // 叶子列的 headerRange 是单列 (startCol === endCol)，分组是多列
  const leafPlaced = new Set<number>()
  for (const hr of headerRanges) {
    if (hr.startRow < headerDepth - 1 && hr.startCol === hr.endCol) {
      leafPlaced.add(hr.startCol)
    }
  }
  for (const col of flatColumns) {
    if (leafPlaced.has(col.colIndex)) continue
    grid[col.rowIndex][col.colIndex] = col.title
  }

  return grid
}
