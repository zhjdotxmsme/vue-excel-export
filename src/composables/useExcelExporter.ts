import { ref, shallowRef } from 'vue'
import type { ExportOptions } from '../types/export'
import { exportExcel as engineExport, buildWorkbook, downloadExcel } from '../engine/builder'

/**
 * Vue3 Hook: Excel 导出功能
 *
 * @example
 * ```ts
 * const { exportExcel, loading, error } = useExcelExporter()
 *
 * await exportExcel({
 *   filename: '报表.xlsx',
 *   columns: [...],
 *   data: response.data,
 * })
 * ```
 */
export function useExcelExporter() {
  const loading = ref(false)
  const error = shallowRef<Error | null>(null)

  /**
   * 导出 Excel 文件
   */
  async function exportExcel(options: ExportOptions): Promise<void> {
    loading.value = true
    error.value = null

    try {
      await engineExport(options)
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      error.value = e
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * 仅构建 Workbook 数据（不触发下载）
   */
  async function build(options: ExportOptions): Promise<Uint8Array> {
    loading.value = true
    error.value = null

    try {
      return await buildWorkbook(options)
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      error.value = e
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    /** 导出 Excel（构建 + 下载） */
    exportExcel,
    /** 仅构建 Workbook，返回 Uint8Array */
    build,
    /** 是否正在导出 */
    loading,
    /** 导出错误信息 */
    error,
  }
}
