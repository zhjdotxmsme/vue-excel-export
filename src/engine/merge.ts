import type { MergeRule, MergeRange } from '../types/style'
import type { FlatColumn } from '../types/column'

export function calculateMerges(
  flatColumns: FlatColumn[],
  data: Record<string, unknown>[],
  headerDepth: number,
): MergeRange[] {
  const merges: MergeRange[] = []

  for (const col of flatColumns) {
    if (!col.merge || !col.field) continue
    const rule = col.merge
    const ci = col.colIndex
    const ds = headerDepth

    if (rule.type === 'always') {
      if (data.length > 1) {
        merges.push({ startRow: ds, startCol: ci, endRow: ds + data.length - 1, endCol: ci })
      }
    } else if (rule.type === 'value') {
      runMergePass(data, col.field, ci, ds, (a, b) => a !== b, merges)
    } else if (rule.type === 'custom') {
      runMergePass(data, col.field, ci, ds, (a, b, i) => !rule.when(a, b, i), merges)
    }
  }

  return merges
}

function runMergePass(
  data: Record<string, unknown>[],
  field: string,
  colIndex: number,
  dataStart: number,
  isBoundary: (prev: unknown, curr: unknown, rowIndex: number) => boolean,
  merges: MergeRange[],
): void {
  let groupStart = dataStart
  for (let i = 1; i < data.length; i++) {
    if (isBoundary(data[i - 1][field], data[i][field], i)) {
      if (dataStart + i - 1 > groupStart) {
        merges.push({ startRow: groupStart, startCol: colIndex, endRow: dataStart + i - 1, endCol: colIndex })
      }
      groupStart = dataStart + i
    }
  }
  if (dataStart + data.length - 1 > groupStart) {
    merges.push({ startRow: groupStart, startCol: colIndex, endRow: dataStart + data.length - 1, endCol: colIndex })
  }
}

export function optimizeMerges(merges: MergeRange[]): MergeRange[] {
  if (merges.length <= 1) return merges

  const grouped = new Map<number, MergeRange[]>()
  for (const m of merges) {
    if (m.startCol === m.endCol) {
      const list = grouped.get(m.startCol) || []
      list.push(m)
      grouped.set(m.startCol, list)
    }
  }

  const result: MergeRange[] = []
  for (const [, list] of grouped) {
    list.sort((a, b) => a.startRow - b.startRow)
    let cur = list[0]
    for (let i = 1; i < list.length; i++) {
      const next = list[i]
      if (cur.endRow + 1 >= next.startRow && cur.startCol === next.startCol && cur.endCol === next.endCol) {
        cur = { ...cur, endRow: Math.max(cur.endRow, next.endRow) }
      } else {
        result.push(cur)
        cur = next
      }
    }
    result.push(cur)
  }

  for (const m of merges) {
    if (m.startCol !== m.endCol) {
      if (!result.some((r) => r.startRow === m.startRow && r.startCol === m.startCol &&
        r.endRow === m.endRow && r.endCol === m.endCol)) {
        result.push(m)
      }
    }
  }

  return result
}
