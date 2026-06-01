import { WorkbookBuilder } from 'hucre'
import type { CellValue, Cell, CellStyle as HucreCellStyle } from 'hucre'
import type { ExportOptions } from '../types/export'
import type { FlatColumn, HeaderInfo } from '../types/column'
import { parseHeaders, buildHeaderGrid } from './header'
import { calculateMerges } from './merge'
import {
  toHucreCellStyle,
  defaultHeaderStyle,
  defaultGroupHeaderStyle,
  defaultCellStyle,
} from './styler'

/**
 * 构建 Excel 工作簿并返回 Uint8Array
 */
export async function buildWorkbook(options: ExportOptions): Promise<Uint8Array> {
  const { columns, data, sheetName = 'Sheet1', autoColumnWidth = true } = options

  // 1. 解析表头
  const headerInfo: HeaderInfo = parseHeaders(columns)
  const { flatColumns, headerDepth, headerRanges } = headerInfo
  const headerGrid = buildHeaderGrid(headerInfo)

  // 2. 数据范围
  const dataStartRow = headerDepth
  const totalRows = headerDepth + data.length
  const totalCols = flatColumns.length

  // 3. 构建默认样式（复用）
  const baseHeaderStyle = defaultHeaderStyle()
  const baseGroupStyle = defaultGroupHeaderStyle()
  const baseCellStyle = defaultCellStyle()

  // 4. 计算合并
  const dataMerges = calculateMerges(flatColumns, data as Record<string, unknown>[], headerDepth)

  // 5. 构建 Workbook
  let builder = WorkbookBuilder.create().addSheet(sheetName)

  // 5a. 配置列 — 默认最适应宽度，用户指定 width 时固定宽度
  for (const col of flatColumns) {
    if (autoColumnWidth) {
      // 最适应宽度：hucre 根据所有单元格内容自动计算
      builder = builder.column({
        header: col.title,
        key: col.field,
        width: col.width,          // 用户指定 width 作为最小宽度
        autoWidth: true,
      })
    } else {
      builder = builder.column({
        header: col.title,
        key: col.field,
        ...(col.width ? { width: col.width } : {}),
      })
    }
  }

  // 5b. 写入表头行数据
  // 先用空值填充所有表头单元格
  for (let r = 0; r < headerDepth; r++) {
    const rowValues: CellValue[] = []
    for (let c = 0; c < totalCols; c++) {
      const title = headerGrid[r]?.[c] || ''
      rowValues.push(title)
    }
    if (rowValues.length > 0) {
      builder = builder.row(rowValues)
    }
  }

  // 5c. 为表头行应用样式（通过 cell 覆盖）
  for (let r = 0; r < headerDepth; r++) {
    for (let c = 0; c < totalCols; c++) {
      // 确定该列的分组信息
      const flatCol = flatColumns.find((f) => f.colIndex === c)
      const isGroupHeader = headerRanges.some(
        (hr) => hr.startCol <= c && hr.endCol >= c && hr.startRow === r,
      )

      // 合并列样式优先级：列配置 style > 全局 headerStyle > 默认
      const mergedHucreStyle = mergeStyles(
        baseHeaderStyle,
        isGroupHeader ? baseGroupStyle : undefined,
        flatCol?.style ? toHucreCellStyle(flatCol.style) : undefined,
        options.headerStyle ? toHucreCellStyle(options.headerStyle) : undefined,
      )

      if (mergedHucreStyle) {
        builder = builder.cell(r, c, { style: mergedHucreStyle } as Partial<Cell>)
      }
    }
  }

  // 5d. 写入数据行
  for (let i = 0; i < data.length; i++) {
    const rowData = data[i] as Record<string, unknown>
    const rowValues: CellValue[] = []

    for (const col of flatColumns) {
      if (!col.field) {
        rowValues.push(null)
      } else {
        const val = rowData[col.field]
        rowValues.push(
          val === undefined || val === null
            ? null
            : (val as CellValue),
        )
      }
    }

    if (rowValues.length > 0) {
      builder = builder.row(rowValues)
    }
  }

  // 5e. 为数据行应用样式
  for (let i = 0; i < data.length; i++) {
    const rowIdx = dataStartRow + i
    for (let c = 0; c < totalCols; c++) {
      const flatCol = flatColumns.find((f) => f.colIndex === c)
      const mergedHucreStyle = mergeStyles(
        baseCellStyle,
        flatCol?.style ? toHucreCellStyle(flatCol.style) : undefined,
        options.cellStyle ? toHucreCellStyle(options.cellStyle) : undefined,
      )
      if (mergedHucreStyle) {
        builder = builder.cell(rowIdx, c, { style: mergedHucreStyle } as Partial<Cell>)
      }
    }
  }

  // 5f. 应用表头合并
  for (const hr of headerRanges) {
    if (hr.endCol >= hr.startCol || hr.endRow >= hr.startRow) {
      builder = builder.merge(hr.startRow, hr.startCol, hr.endRow, hr.endCol)
    }
  }

  // 5g. 应用数据合并
  for (const dm of dataMerges) {
    builder = builder.merge(dm.startRow, dm.startCol, dm.endRow, dm.endCol)
  }

  // 6. 生成
  return await builder.build()
}

/**
 * 合并多个样式（后面的覆盖前面，undefined 忽略）
 */
function mergeStyles(...styles: (HucreCellStyle | undefined)[]): HucreCellStyle | undefined {
  const result: HucreCellStyle = {}
  let hasAny = false

  for (const style of styles) {
    if (!style) continue
    hasAny = true
    // font
    if (style.font) {
      result.font = { ...result.font, ...style.font }
    }
    // fill
    if (style.fill) {
      result.fill = style.fill
    }
    // border
    if (style.border) {
      result.border = { ...result.border, ...style.border }
    }
    // alignment
    if (style.alignment) {
      result.alignment = { ...result.alignment, ...style.alignment }
    }
    // numFmt
    if (style.numFmt !== undefined) {
      result.numFmt = style.numFmt
    }
  }

  return hasAny ? result : undefined
}

/**
 * 触发浏览器下载
 */
export function downloadExcel(buffer: Uint8Array, filename: string = 'export.xlsx'): void {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * 导出 Excel（build + download 一步完成）
 */
export async function exportExcel(options: ExportOptions): Promise<void> {
  const buffer = await buildWorkbook(options)
  const filename = options.filename || 'export.xlsx'
  downloadExcel(buffer, filename)
}
