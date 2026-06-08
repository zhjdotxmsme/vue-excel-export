<template>
  <slot
    name="trigger"
    :exportExcel="handleExport"
    :loading="loading"
  >
    <button
      :disabled="loading"
      @click="handleExport"
    >
      {{ loading ? '导出中...' : '导出 Excel' }}
    </button>
  </slot>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import type { ColumnConfig, CellStyle, MergeRule, PaginationConfig, ExportProgress } from '../types'
import { useExcelExporter } from '../composables/useExcelExporter'

interface ExcelExportProps {
  /** 列配置 */
  columns: ColumnConfig[]
  /** 数据源（与 pagination 互斥） */
  data?: Record<string, unknown>[]
  /** 分页配置（与 data 互斥，优先级高于 data） */
  pagination?: PaginationConfig
  /** 导出文件名 */
  filename?: string
  /** Sheet 名称 */
  sheetName?: string
  /** 全局表头样式 */
  headerStyle?: Partial<CellStyle>
  /** 全局数据样式 */
  cellStyle?: Partial<CellStyle>
  /** 自动列宽 */
  autoColumnWidth?: boolean
  /** 导出进度回调（分页模式生效） */
  onProgress?: (progress: ExportProgress) => void
}

const props = withDefaults(defineProps<ExcelExportProps>(), {
  filename: 'export.xlsx',
  sheetName: 'Sheet1',
  autoColumnWidth: true,
})

const emit = defineEmits<{
  (e: 'before-export'): void
  (e: 'after-export'): void
  (e: 'error', err: Error): void
}>()

const { exportExcel, loading, error } = useExcelExporter()

watch(error, (err) => {
  if (err) {
    emit('error', err)
  }
})

async function handleExport() {
  emit('before-export')
  try {
    const opts: Parameters<typeof exportExcel>[0] = {
      columns: props.columns,
      filename: props.filename,
      sheetName: props.sheetName,
      headerStyle: props.headerStyle,
      cellStyle: props.cellStyle,
      autoColumnWidth: props.autoColumnWidth,
    }

    if (props.pagination) {
      opts.pagination = props.pagination
      opts.onProgress = props.onProgress
    } else if (props.data) {
      opts.data = props.data
    }

    await exportExcel(opts)
    emit('after-export')
  } catch (err) {
    // error is already handled by useExcelExporter
  }
}
</script>
