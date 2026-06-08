import { describe, it, expect, vi } from 'vitest'
import { buildWorkbook, buildWorkbookPaginated } from '../src/engine/builder'
import type { ColumnConfig, ExportOptions, PaginationConfig, ExportProgress } from '../src/types'

describe('buildWorkbook', () => {
  it('builds workbook with simple columns', async () => {
    const options: ExportOptions = {
      columns: [
        { title: 'Name', field: 'name', width: 100 },
        { title: 'Age', field: 'age', width: 80 },
      ],
      data: [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
      ],
      filename: 'test.xlsx',
    }
    const buffer = await buildWorkbook(options)
    expect(buffer).toBeInstanceOf(Uint8Array)
    expect(buffer.length).toBeGreaterThan(0)
  })

  it('builds workbook with grouped headers', async () => {
    const options: ExportOptions = {
      columns: [
        { title: '姓名', field: 'name', width: 100 },
        {
          title: '个人信息',
          children: [
            { title: '年龄', field: 'age', width: 80 },
            { title: '性别', field: 'gender', width: 80 },
          ],
        },
        {
          title: '业绩',
          children: [
            { title: 'Q1', field: 'q1', width: 80 },
            { title: 'Q2', field: 'q2', width: 80 },
          ],
        },
      ],
      data: [
        { name: '张三', age: 28, gender: '男', q1: 100, q2: 120 },
        { name: '李四', age: 32, gender: '女', q1: 200, q2: 180 },
      ],
    }
    const buffer = await buildWorkbook(options)
    expect(buffer).toBeInstanceOf(Uint8Array)
    expect(buffer.length).toBeGreaterThan(0)
  })

  it('builds workbook with merge rules', async () => {
    const options: ExportOptions = {
      columns: [
        { title: '部门', field: 'dept', width: 100, merge: { type: 'value' } },
        { title: '姓名', field: 'name', width: 100 },
        { title: '销售额', field: 'sales', width: 100 },
      ],
      data: [
        { dept: '技术部', name: '张三', sales: 100 },
        { dept: '技术部', name: '李四', sales: 200 },
        { dept: '市场部', name: '王五', sales: 150 },
        { dept: '市场部', name: '赵六', sales: 180 },
      ],
    }
    const buffer = await buildWorkbook(options)
    expect(buffer).toBeInstanceOf(Uint8Array)
    expect(buffer.length).toBeGreaterThan(0)
  })

  it('handles empty data gracefully', async () => {
    const options: ExportOptions = {
      columns: [
        { title: 'Name', field: 'name' },
      ],
      data: [],
    }
    const buffer = await buildWorkbook(options)
    expect(buffer).toBeInstanceOf(Uint8Array)
    expect(buffer.length).toBeGreaterThan(0)
  })

  it('handles custom header styles', async () => {
    const options: ExportOptions = {
      columns: [
        { title: 'Name', field: 'name' },
      ],
      data: [{ name: 'Alice' }],
      headerStyle: { bold: true, bgColor: '#4472C4', fontColor: '#FFFFFF' },
    }
    const buffer = await buildWorkbook(options)
    expect(buffer).toBeInstanceOf(Uint8Array)
  })

  it('handles custom cell styles', async () => {
    const options: ExportOptions = {
      columns: [
        { title: 'Amount', field: 'amount' },
      ],
      data: [{ amount: 100 }],
      cellStyle: { align: 'right' },
    }
    const buffer = await buildWorkbook(options)
    expect(buffer).toBeInstanceOf(Uint8Array)
  })
})

describe('buildWorkbookPaginated', () => {
  const baseColumns: ColumnConfig[] = [
    { title: 'Name', field: 'name', width: 100 },
    { title: 'Age', field: 'age', width: 80 },
  ]

  it('builds workbook with single page', async () => {
    const options: ExportOptions = {
      columns: baseColumns,
      pagination: {
        pageSize: 500,
        fetch: async () => ({
          data: [
            { name: 'Alice', age: 30 },
            { name: 'Bob', age: 25 },
          ],
          total: 2,
        }),
      },
    }
    const buffer = await buildWorkbookPaginated(options)
    expect(buffer).toBeInstanceOf(Uint8Array)
    expect(buffer.length).toBeGreaterThan(0)
  })

  it('builds workbook with multiple pages', async () => {
    let callCount = 0
    const options: ExportOptions = {
      columns: baseColumns,
      pagination: {
        pageSize: 2,
        fetch: async (page) => {
          callCount++
          if (page === 1) return { data: [{ name: 'A1', age: 1 }, { name: 'A2', age: 2 }], total: 5 }
          if (page === 2) return { data: [{ name: 'B1', age: 3 }, { name: 'B2', age: 4 }], total: 5 }
          return { data: [{ name: 'C1', age: 5 }], total: 5 }
        },
      },
    }
    const buffer = await buildWorkbookPaginated(options)
    expect(buffer).toBeInstanceOf(Uint8Array)
    expect(buffer.length).toBeGreaterThan(0)
    expect(callCount).toBe(3)
  })

  it('handles empty result gracefully', async () => {
    const options: ExportOptions = {
      columns: baseColumns,
      pagination: {
        pageSize: 500,
        fetch: async () => ({ data: [], total: 0 }),
      },
    }
    const buffer = await buildWorkbookPaginated(options)
    expect(buffer).toBeInstanceOf(Uint8Array)
    expect(buffer.length).toBeGreaterThan(0)
  })

  it('throws on fetch failure', async () => {
    const options: ExportOptions = {
      columns: baseColumns,
      pagination: {
        pageSize: 500,
        fetch: async () => { throw new Error('Network error') },
      },
    }
    await expect(buildWorkbookPaginated(options)).rejects.toThrow('Network error')
  })

  it('calls onProgress with correct parameters', async () => {
    const progressCalls: ExportProgress[] = []
    const options: ExportOptions = {
      columns: baseColumns,
      pagination: {
        pageSize: 2,
        fetch: async (page) => {
          if (page === 1) return { data: [{ name: 'A', age: 1 }, { name: 'B', age: 2 }], total: 4 }
          return { data: [{ name: 'C', age: 3 }, { name: 'D', age: 4 }], total: 4 }
        },
      },
      onProgress: (p) => { progressCalls.push(p) },
    }
    await buildWorkbookPaginated(options)

    expect(progressCalls).toHaveLength(2)
    expect(progressCalls[0]).toMatchObject({ page: 1, totalPages: 2, fetched: 2, total: 4 })
    expect(progressCalls[1]).toMatchObject({ page: 2, totalPages: 2, fetched: 4, total: 4 })
  })

  it('applies merge rules within each batch', async () => {
    // value merge on dept column — batch 1 has dept A, batch 2 has dept A
    // merges should NOT cross batch boundary
    const cols: ColumnConfig[] = [
      { title: 'Dept', field: 'dept', width: 80, merge: { type: 'value' } },
      { title: 'Name', field: 'name', width: 100 },
    ]
    const options: ExportOptions = {
      columns: cols,
      pagination: {
        pageSize: 3,
        fetch: async (page) => {
          if (page === 1) {
            return {
              data: [
                { dept: 'Engineering', name: 'Alice' },
                { dept: 'Engineering', name: 'Bob' },
                { dept: 'Engineering', name: 'Charlie' },
              ],
              total: 4,
            }
          }
          return {
            data: [{ dept: 'Engineering', name: 'David' }],
            total: 4,
          }
        },
      },
    }
    const buffer = await buildWorkbookPaginated(options)
    expect(buffer).toBeInstanceOf(Uint8Array)
    expect(buffer.length).toBeGreaterThan(0)
  })
})
