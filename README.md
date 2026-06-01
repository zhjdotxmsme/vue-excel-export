# vue-excel-export

基于 **Vue 3 + TypeScript + [hucre](https://github.com/productdevbook/hucre)** 的 Excel 导出组件。将后端 JSON 数据渲染为格式化的 `.xlsx` 文件，支持多级嵌套表头、自定义列合并规则、单元格样式。

- 🚀 **零框架依赖** — engine 层纯 TypeScript，无 Vue 耦合
- 📦 **轻量** — 打包后仅 ~3.6 KB (gzip)
- 🎨 **样式支持** — 字体/颜色/对齐/边框/背景
- 🧩 **双形态** — Hook (`useExcelExporter`) + 组件 (`<ExcelExport>`)
- 🌳 **Tree-shakable** — 按需导入，不拖累 bundle

---

## 安装

```bash
npm install vue-excel-export hucre
```

> `hucre` 是 peer dependency，需要单独安装。

---

## 快速开始

### 方式一：组件式

```vue
<script setup lang="ts">
import { ExcelExport } from 'vue-excel-export'
import type { ColumnConfig } from 'vue-excel-export'

const columns: ColumnConfig[] = [
  { title: '姓名', field: 'name', width: 100 },
  { title: '年龄', field: 'age', width: 80 },
  { title: '部门', field: 'dept', width: 120 },
]

const data = [
  { name: '张三', age: 28, dept: '技术部' },
  { name: '李四', age: 35, dept: '市场部' },
]
</script>

<template>
  <ExcelExport
    :columns="columns"
    :data="data"
    filename="用户列表.xlsx"
  >
    <template #trigger="{ exportExcel, loading }">
      <button :disabled="loading">
        {{ loading ? '导出中...' : '导出 Excel' }}
      </button>
    </template>
  </ExcelExport>
</template>
```

### 方式二：Hook 式

```typescript
import { useExcelExporter } from 'vue-excel-export'

const { exportExcel, loading } = useExcelExporter()

async function handleExport() {
  await exportExcel({
    filename: '报表.xlsx',
    columns: [
      { title: '产品', field: 'product', width: 120 },
      { title: '销量', field: 'sales', width: 80 },
    ],
    data: [
      { product: 'Widget', sales: 100 },
      { product: 'Gadget', sales: 200 },
    ],
  })
}
```

---

## 核心概念

### ColumnConfig — 列配置

```typescript
// 叶子列（对应数据字段）
interface LeafColumn {
  title: string
  field: string
  width?: number
  align?: 'left' | 'center' | 'right'
  style?: Partial<CellStyle>
  merge?: MergeRule
}

// 分组列（包含子列）
interface GroupColumn {
  title: string
  children: ColumnConfig[]
  align?: 'left' | 'center' | 'right'
  style?: Partial<CellStyle>
}

type ColumnConfig = LeafColumn | GroupColumn
```

### 多级嵌套表头

```typescript
const columns: ColumnConfig[] = [
  { title: '姓名', field: 'name' },
  {
    title: '个人信息',
    children: [
      { title: '年龄', field: 'age' },
      { title: '性别', field: 'gender' },
    ],
  },
  {
    title: '业绩',
    children: [
      { title: 'Q1', field: 'q1' },
      { title: 'Q2', field: 'q2' },
      { title: 'Q3', field: 'q3' },
    ],
  },
]
```

输出 Excel 表头：

```
         | 个人信息         | 业绩                    |
         | 姓名 | 年龄 | 性别 | Q1   | Q2   | Q3   |
```

支持任意层级嵌套（3 层、4 层等）：

```typescript
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
```

输出：

```
         | 总体                              |
         | 区域                    | 销售额   |
         | 省份         | 城市     |          |
```

---

## 列合并

### 合并规则类型

```typescript
type MergeRule =
  // 相邻相同值自动合并
  | { type: 'value' }
  // 整列完全合并
  | { type: 'always' }
  // 自定义条件合并
  | { type: 'custom'; when: (current: any, next: any, rowIndex: number) => boolean }
```

### 示例：相同值合并

```typescript
const columns: ColumnConfig[] = [
  {
    title: '部门',
    field: 'dept',
    width: 100,
    merge: { type: 'value' }, // 相同部门自动合并
  },
  { title: '姓名', field: 'name' },
  { title: '销售额', field: 'sales' },
]
```

原始数据有三行同部门 → Excel 中该三行合并为一个单元格。

### 示例：整列合并

```typescript
{ title: '备注', field: 'remark', merge: { type: 'always' } }
```

### 示例：自定义条件合并

```typescript
{ title: '状态', field: 'status', merge: {
  type: 'custom',
  when: (current, next) => current === next, // 相邻相等时合并
}}
```

---

## 样式

### CellStyle

```typescript
interface CellStyle {
  bold?: boolean
  italic?: boolean
  fontSize?: number
  fontColor?: string        // hex: '#FF0000'
  fontName?: string         // '微软雅黑'
  bgColor?: string          // hex 背景色
  align?: 'left' | 'center' | 'right'
  verticalAlign?: 'top' | 'middle' | 'bottom'
  border?: CellBorder
}
```

### 样式优先级

```
列配置 style > 全局 headerStyle/cellStyle > 内置默认样式
```

内置默认样式：

| 区域 | 样式 |
|------|------|
| 表头 | 加粗、背景 `#F0F0F0`、居中、细边框 |
| 分组表头 | 加粗、背景 `#D9E2F3`、居中 |
| 数据行 | 常规、居左、细边框 |

### 示例：自定义样式

```typescript
// 列级样式
{
  title: '金额',
  field: 'amount',
  style: { align: 'right', bold: true, fontColor: '#C00000' },
}

// 全局样式（覆盖整个表头或数据区）
await exportExcel({
  columns,
  data,
  headerStyle: { bgColor: '#4472C4', fontColor: '#FFFFFF', bold: true },
  cellStyle: { border: { top: true, bottom: true, left: true, right: true } },
})
```

---

## API 参考

### useExcelExporter()

```typescript
function useExcelExporter(): {
  exportExcel: (options: ExportOptions) => Promise<void>
  loading: Ref<boolean>
  error: Ref<Error | null>
}
```

| 返回值 | 类型 | 说明 |
|--------|------|------|
| `exportExcel` | `(options) => Promise<void>` | 构建 + 下载一步完成 |
| `loading` | `Ref<boolean>` | 导出进行中 |
| `error` | `Ref<Error \| null>` | 导出异常 |

### ExportOptions

```typescript
interface ExportOptions {
  columns: ColumnConfig[]          // 列配置（必填）
  data: Record<string, any>[]     // JSON 数据（必填）
  filename?: string                // 文件名，默认 'export.xlsx'
  sheetName?: string               // Sheet 名称，默认 'Sheet1'
  headerStyle?: Partial<CellStyle> // 全局表头样式
  cellStyle?: Partial<CellStyle>   // 全局数据样式
  autoColumnWidth?: boolean        // 最适应列宽，默认 true
}
```

> `autoColumnWidth: true`（默认）启用 hucre 内置的自动列宽计算，根据每列所有单元格（含表头）的内容宽度，自动确定最优列宽。支持 CJK 双宽度字符和数字格式。
>
> 设置为 `false` 时使用 Excel 默认列宽，或用户通过 `ColumnConfig.width` 指定的固定宽度。

### ExcelExport 组件 Props

| 名称 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `columns` | `ColumnConfig[]` | — | 列配置（必填） |
| `data` | `Record<string, any>[]` | — | 数据源（必填） |
| `filename` | `string` | `'export.xlsx'` | 导出文件名 |
| `sheetName` | `string` | `'Sheet1'` | Sheet 名称 |
| `headerStyle` | `Partial<CellStyle>` | — | 全局表头样式 |
| `cellStyle` | `Partial<CellStyle>` | — | 全局数据样式 |
| `autoColumnWidth` | `boolean` | `true` | 自动列宽 |

### ExcelExport 组件 Events

| 名称 | 参数 | 说明 |
|------|------|------|
| `before-export` | — | 导出前触发 |
| `after-export` | — | 导出后触发 |
| `error` | `Error` | 导出失败 |

### ExcelExport 组件 Slots

| 名称 | 参数 | 说明 |
|------|------|------|
| `trigger` | `{ exportExcel: () => void, loading: boolean }` | 自定义触发按钮 |

---

## 完整示例

### 重命名 hucre 类型冲突

`vue-excel-export` 导出的类型与 `hucre` 无冲突，可以直接混用：

```typescript
import { ExcelExport, useExcelExporter } from 'vue-excel-export'
import { writeXlsx } from 'hucre' // 直接使用 hucre 做其他操作
```

### 大型项目中的典型用法

```typescript
// composables/useReportExport.ts
import { useExcelExporter } from 'vue-excel-export'
import type { ColumnConfig } from 'vue-excel-export'

export function useReportExport() {
  const { exportExcel, loading } = useExcelExporter()

  const reportColumns: ColumnConfig[] = [
    { title: '日期', field: 'date', width: 120 },
    { title: '订单数', field: 'orders', width: 80, style: { align: 'right' } },
    {
      title: '收入',
      children: [
        { title: '线上', field: 'onlineRevenue', width: 100 },
        { title: '线下', field: 'offlineRevenue', width: 100 },
        { title: '合计', field: 'totalRevenue', width: 100, style: { bold: true } },
      ],
    },
  ]

  async function exportReport(data: Record<string, any>[]) {
    return exportExcel({
      columns: reportColumns,
      data,
      filename: `报表_${new Date().toISOString().slice(0, 10)}.xlsx`,
      headerStyle: { bgColor: '#2E75B6', fontColor: '#FFFFFF' },
    })
  }

  return { exportReport, loading }
}
```

---

## 开发

```bash
# 安装依赖
npm install

# 类型检查
npm run typecheck

# 单元测试
npm test

# 构建
npm run build

# 启动示例项目
cd example && npm install && npm run dev
```

---

## 技术栈

- **Vue 3** — Composition API + TypeScript
- **hucre** ^0.3.0 — 零依赖电子表格引擎（[GitHub](https://github.com/productdevbook/hucre)）
- **Vite** — 库模式构建
- **Vitest** — 单元测试

## License

MIT
