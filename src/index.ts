// ── Types ──────────────────────────────────────────────────────────
export type {
  ColumnConfig,
  LeafColumn,
  GroupColumn,
  FlatColumn,
  HeaderInfo,
  HeaderMergeRange,
  CellStyle,
  CellBorder,
  BorderStyleItem,
  MergeRule,
  MergeRange,
  ExportOptions,
  PaginationConfig,
  PaginationResult,
  ExportProgress,
} from './types'

// ── Engine ─────────────────────────────────────────────────────────
export { buildWorkbook, buildWorkbookPaginated, downloadExcel, exportExcel } from './engine/builder'
export { parseHeaders, buildHeaderGrid } from './engine/header'
export { calculateMerges, optimizeMerges } from './engine/merge'
export { toHucreCellStyle, defaultHeaderStyle, defaultGroupHeaderStyle, defaultCellStyle } from './engine/styler'

// ── Composables ────────────────────────────────────────────────────
export { useExcelExporter } from './composables/useExcelExporter'

// ── Components ─────────────────────────────────────────────────────
export { default as ExcelExport } from './components/ExcelExport.vue'
