import { describe, it, expect } from 'vitest'
import { parseHeaders, buildHeaderGrid } from '../src/engine/header'
import type { ColumnConfig } from '../src/types'

describe('parseHeaders', () => {
  it('flattens simple single-level columns', () => {
    const columns: ColumnConfig[] = [
      { title: '姓名', field: 'name', width: 100 },
      { title: '年龄', field: 'age', width: 80 },
    ]
    const result = parseHeaders(columns)
    expect(result.headerDepth).toBe(1)
    expect(result.flatColumns).toHaveLength(2)
    expect(result.flatColumns[0]).toMatchObject({ title: '姓名', field: 'name', colIndex: 0, rowIndex: 0 })
    expect(result.flatColumns[1]).toMatchObject({ title: '年龄', field: 'age', colIndex: 1, rowIndex: 0 })
    expect(result.headerRanges).toHaveLength(0)
  })

  it('flattens grouped 2-level headers', () => {
    const columns: ColumnConfig[] = [
      { title: '姓名', field: 'name' },
      {
        title: '个人信息',
        children: [
          { title: '年龄', field: 'age' },
          { title: '性别', field: 'gender' },
        ],
      },
    ]
    const result = parseHeaders(columns)
    expect(result.headerDepth).toBe(2)
    expect(result.flatColumns).toHaveLength(3)
    // all leaves at maxDepth-1 = rowIndex 1
    expect(result.flatColumns[0]).toMatchObject({ title: '姓名', field: 'name', colIndex: 0, rowIndex: 1 })
    expect(result.flatColumns[1]).toMatchObject({ title: '年龄', field: 'age', colIndex: 1, rowIndex: 1 })
    expect(result.flatColumns[2]).toMatchObject({ title: '性别', field: 'gender', colIndex: 2, rowIndex: 1 })
    // 个人信息 merges row0, col1:2
    expect(result.headerRanges).toHaveLength(2) // group merge + name's title at row0
    expect(result.headerRanges).toContainEqual(
      expect.objectContaining({ title: '个人信息', startRow: 0, startCol: 1, endRow: 0, endCol: 2 }),
    )
  })

  it('handles 3-level nested headers', () => {
    const columns: ColumnConfig[] = [
      {
        title: '总体',
        children: [
          {
            title: '区域',
            children: [
              { title: '省份', field: 'province' },
              { title: '城市', field: 'city' },
            ],
          },
          { title: '销售额', field: 'sales' },
        ],
      },
    ]
    const result = parseHeaders(columns)
    expect(result.headerDepth).toBe(3)
    expect(result.flatColumns).toHaveLength(3)
    // all leaves at maxDepth-1 = rowIndex 2
    expect(result.flatColumns[0]).toMatchObject({ title: '省份', field: 'province', colIndex: 0, rowIndex: 2 })
    expect(result.flatColumns[1]).toMatchObject({ title: '城市', field: 'city', colIndex: 1, rowIndex: 2 })
    expect(result.flatColumns[2]).toMatchObject({ title: '销售额', field: 'sales', colIndex: 2, rowIndex: 2 })
    // 总体 merges row0 col0:2
    // 区域 merges row1 col0:1
    expect(result.headerRanges).toHaveLength(3) // 总体 + 区域 + 销售额 (sales at non-bottom row)
    expect(result.headerRanges).toContainEqual(
      expect.objectContaining({ title: '区域', startRow: 1, startCol: 0, endRow: 1, endCol: 1 }),
    )
    expect(result.headerRanges).toContainEqual(
      expect.objectContaining({ title: '总体', startRow: 0, startCol: 0, endRow: 0, endCol: 2 }),
    )
  })

  it('counts leaf columns correctly', () => {
    const columns: ColumnConfig[] = [
      { title: 'A', field: 'a' },
      {
        title: 'B',
        children: [
          { title: 'B1', field: 'b1' },
          { title: 'B2', field: 'b2' },
        ],
      },
      { title: 'C', field: 'c' },
    ]
    const result = parseHeaders(columns)
    expect(result.flatColumns).toHaveLength(4)
    expect(result.flatColumns.map((f) => f.title)).toEqual(['A', 'B1', 'B2', 'C'])
  })

  it('preserves parentTitle on flat columns', () => {
    const columns: ColumnConfig[] = [
      {
        title: '组',
        children: [
          { title: '子1', field: 'c1' },
          { title: '子2', field: 'c2' },
        ],
      },
    ]
    const result = parseHeaders(columns)
    expect(result.flatColumns[0].parentTitle).toBe('组')
    expect(result.flatColumns[1].parentTitle).toBe('组')
  })
})

describe('buildHeaderGrid', () => {
  it('builds correct header grid for 2-level headers', () => {
    const columns: ColumnConfig[] = [
      { title: '姓名', field: 'name' },
      {
        title: '业绩',
        children: [
          { title: 'Q1', field: 'q1' },
          { title: 'Q2', field: 'q2' },
        ],
      },
    ]
    const info = parseHeaders(columns)
    const grid = buildHeaderGrid(info)
    expect(grid).toHaveLength(2)
    expect(grid[0]).toEqual(['姓名', '业绩', ''])
    expect(grid[1]).toEqual(['', 'Q1', 'Q2'])
    // 姓名 is at row 0 (currentDepth=0 < maxDepth-1=1) so it gets a headerRange
    // 业绩 is a group, merges row0 col1:2
  })
})
