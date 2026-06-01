import { describe, it, expect } from 'vitest'
import { buildWorkbook } from '../src/engine/builder'
import type { ColumnConfig, ExportOptions } from '../src/types'

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
