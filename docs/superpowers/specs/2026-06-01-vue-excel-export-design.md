# Vue Excel Export Component — Design Spec

基于 Vue3 + TypeScript + hucre 的 Excel 导出组件，用于前端将后端 JSON 数据导出为带格式的 xlsx 文件。

---

## 1. 需求概述

| 维度 | 说明 |
|------|------|
| **底层库** | hucre（零依赖 TypeScript 电子表格引擎，~18KB gzip） |
| **数据来源** | 后端返回 JSON 数组 → 前端转为 Excel |
| **表头类型** | 分组多级表头（支持递归嵌套 children） |
| **合并逻辑** | 自定义合并规则（同值合并/始终合并/条件合并） |
| **使用方式** | Hook (`useExcelExporter`) + 组件 (`<ExcelExport>`) 双形态 |
| **样式** | 基础样式：字体/字号/颜色/对齐/边框/背景色 |
| **触发方式** | 前端主动调用 `exportExcel()` 触发下载 |
| **定位** | 可发布为 npm 包，供其他 Vue3 项目使用 |

---

## 2. 架构设计

```
vue-excel-export/
├── src/
│   ├── types/              # 核心类型定义
│   │   ├── column.ts       # ColumnConfig, LeafColumn, GroupColumn
│   │   ├── export.ts       # ExportOptions, MergeRule
│   │   └── style.ts        # CellStyle
│   ├── engine/             # 核心引擎（零 Vue 依赖）
│   │   ├── header.ts       # 多级表头解析 → 扁平化 FlatColumn[]
│   │   ├── merge.ts        # 合并规则计算 → MergeRange[]
│   │   ├── styler.ts       # 样式应用到 hucre Cell
│   │   └── builder.ts      # hucre Worksheet 构建编排 + writeXlsx
│   ├── composables/        # Vue3 Hook
│   │   └── useExcelExporter.ts
│   ├── components/         # 组件
│   │   └── ExcelExport.vue
│   └── index.ts            # 统一导出入口
├── test/                   # 单元测试
│   ├── header.test.ts
│   ├── merge.test.ts
│   ├── builder.test.ts
│   └── useExcelExporter.test.ts
├── docs/
│   └── superpowers/specs/
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

### 分层原则

- **engine/** — 纯 TypeScript，零 Vue 依赖，可独立测试、独立在 Node/浏览器运行
- **composables/** — 封装 Vue3 reactivity（loading/error 状态），调用 engine 方法
- **components/** — 对 Hook 的模板封装，通过 slot 暴露导出能力
- 依赖方向：components → composables → engine，反向不依赖

---

## 3. 核心类型定义

### ColumnConfig（递归嵌套）

```typescript
interface LeafColumn {
  title: string
  field: string
  width?: number
  align?: 'left' | 'center' | 'right'
  style?: CellStyle
  merge?: MergeRule
}

interface GroupColumn {
  title: string
  children: ColumnConfig[]
  align?: 'left' | 'center' | 'right'
  style?: CellStyle
}

type ColumnConfig = LeafColumn | GroupColumn
```

### FlatColumn（内部扁平化表示）

```typescript
interface FlatColumn {
  title: string
  field: string
  colIndex: number          // 0-based Excel 列号
  rowIndex: number          // 表头层级行号
  depth: number             // 总层级数（用于计算 header 行数）
  parentTitle?: string
  width?: number
  align?: 'left' | 'center' | 'right'
  style?: CellStyle
  merge?: MergeRule
}
```

### MergeRule

```typescript
type MergeRule =
  | { type: 'value' }                                    // 相同值自动合并
  | { type: 'always' }                                   // 整列完全合并
  | { type: 'custom'; when: (current: any, next: any, rowIndex: number) => boolean }
```

### MergeRange

```typescript
interface MergeRange {
  startRow: number
  startCol: number
  endRow: number
  endCol: number
}
```

### CellStyle

```typescript
interface CellStyle {
  bold?: boolean
  italic?: boolean
  fontSize?: number
  fontColor?: string          // hex: '#FF0000'
  fontName?: string           // '微软雅黑'
  bgColor?: string            // hex 背景色
  align?: 'left' | 'center' | 'right'
  verticalAlign?: 'top' | 'middle' | 'bottom'
  border?: {
    top?: boolean | BorderStyle
    bottom?: boolean | BorderStyle
    left?: boolean | BorderStyle
    right?: boolean | BorderStyle
  }
}

interface BorderStyle {
  color: string
  style: 'thin' | 'medium' | 'thick'
}
```

### ExportOptions

```typescript
interface ExportOptions {
  columns: ColumnConfig[]
  data: Record<string, any>[]
  filename?: string             // default: 'export.xlsx'
  sheetName?: string            // default: 'Sheet1'
  headerStyle?: CellStyle       // 全局表头样式覆盖
  cellStyle?: CellStyle         // 全局数据格样式覆盖
  autoColumnWidth?: boolean     // default: true
}
```

---

## 4. 引擎核心设计

### 4.1 header.ts — 多级表头解析

**输入：** `ColumnConfig[]`
**输出：** `{ flatColumns: FlatColumn[], headerDepth: number, headerRanges: MergeRange[] }`

算法步骤：
1. 递归遍历 ColumnConfig 树，计算每个叶子列的 depth 和 colIndex
2. 确定总表头行数 = 最大嵌套深度
3. 对每个非叶子节点，计算其 children 占用的列数，生成父级合并范围
4. 返回扁平化的列列表和表头合并区域

```
示例输入：
[
  { title: '姓名', field: 'name' },
  { title: '个人信息', children: [
    { title: '年龄', field: 'age' },
    { title: '性别', field: 'gender' },
  ]},
]

输出：
headerDepth = 2
flatColumns = [
  { title: '姓名', field: 'name', colIndex: 0, rowIndex: 1, depth: 1 },
  { title: '年龄', field: 'age', colIndex: 1, rowIndex: 1, depth: 2 },
  { title: '性别', field: 'gender', colIndex: 2, rowIndex: 1, depth: 2 },
]
headerRanges = [
  // '个人信息' 跨列合并（row 0, col 1 → row 0, col 2）
  { startRow: 0, startCol: 1, endRow: 0, endCol: 2 }
]
Excel 渲染结果：
           |──── 个人信息 ────|
    姓名   | 年龄     | 性别   |
```

### 4.2 merge.ts — 合并规则执行

**输入：** `FlatColumn[] + data[]`
**输出：** `MergeRange[]`

算法：
1. 筛选有 merge 配置的列
2. 每列按 merge.type 判断相邻行是否需要合并
3. type='always'：整列所有行合成一个单元格
4. type='value'：遍历该列数据，相邻相同值视为一个合并区间
5. type='custom'：逐行调用 when(current, next, rowIndex)，返回 true 表示合并
6. 连续合并的区间生成一个 MergeRange，区间内只保留左上角值

### 4.3 builder.ts — 导出构建

核心编排流程：

```
builder(options: ExportOptions) → Promise<Uint8Array>
```

1. **扁平化表头** — 调用 header.ts 得到 flatColumns + headerRanges
2. **构建工作表** — 使用 hucre `new WorkbookBuilder()`
3. **写入表头行** — 遍历每层表头，写入文本，应用样式；合并父级表头单元格
4. **写入数据行** — 按 flatColumns 提取数据，逐行写入，应用样式
5. **应用合并** — 调用 merge.ts 计算数据合并范围，合并单元格
6. **列宽处理** — 计算列宽（用户指定 > 自动计算 > 默认 80px）
7. **生成文件** — 调用 hucre `writeXlsx()` 生成 Uint8Array → 触发浏览器下载

---

## 5. Hook API

### useExcelExporter()

```typescript
function useExcelExporter(): {
  exportExcel: (options: ExportOptions) => Promise<void>
  loading: Ref<boolean>
  error: Ref<Error | null>
}
```

- `exportExcel()`: 核心导出方法，内部调用 builder → writeXlsx → 创建下载链接 → 触发 click
- `loading`: 导出过程中的 loading 状态
- `error`: 导出异常信息

### 使用示例

```typescript
const { exportExcel, loading } = useExcelExporter()

await exportExcel({
  filename: '报表.xlsx',
  columns: [
    { title: '姓名', field: 'name', width: 100 },
    {
      title: '业绩',
      children: [
        { title: 'Q1', field: 'q1', width: 80 },
        { title: 'Q2', field: 'q2', width: 80 },
      ]
    },
    { title: '备注', field: 'remark', merge: { type: 'value' } },
  ],
  data: response.data,
  headerStyle: { bgColor: '#4472C4', fontColor: '#FFFFFF', bold: true },
})
```

---

## 6. 组件 API

```vue
<ExcelExport
  :columns="columns"
  :data="data"
  filename="报表.xlsx"
  :header-style="{ bgColor: '#4472C4' }"
  @before-export="onBefore"
  @after-export="onAfter"
  @error="onError"
>
  <template #trigger="{ exportExcel, loading }">
    <button :disabled="loading">
      {{ loading ? '导出中...' : '导出 Excel' }}
    </button>
  </template>
</ExcelExport>
```

### Props

| 名称 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| columns | `ColumnConfig[]` | — | 列配置（必填） |
| data | `Record<string, any>[]` | — | 数据源（必填） |
| filename | `string` | `'export.xlsx'` | 导出文件名 |
| sheetName | `string` | `'Sheet1'` | Sheet 名称 |
| headerStyle | `CellStyle` | — | 全局表头样式覆盖 |
| cellStyle | `CellStyle` | — | 全局数据样式覆盖 |
| autoColumnWidth | `boolean` | `true` | 自动列宽 |

### Events

| 名称 | 参数 | 说明 |
|------|------|------|
| before-export | — | 导出开始前触发 |
| after-export | — | 导出完成后触发 |
| error | `Error` | 导出失败时触发 |

### Slots

| 名称 | 参数 | 说明 |
|------|------|------|
| trigger | `{ exportExcel: () => void, loading: boolean }` | 自定义触发按钮 |

组件内部调用 `useExcelExporter()` 的 `exportExcel`，将 props 作为 options 传入。

---

## 7. 样式优先级规则

```
列配置 style > 全局 headerStyle/cellStyle > 内置默认样式
```

内置默认样式：

| 区域 | 样式 |
|------|------|
| 表头 | 加粗、bgColor `#F0F0F0`、居中、细边框 |
| 数据行 | 常规、bgColor `#FFFFFF`、居左、细边框 |
| 父级分组表头 | 加粗、bgColor `#D9E2F3`、居中对齐 |

---

## 8. 错误处理

- `columns` 为空 → 抛出 `Error('columns is required')`
- `data` 为空 → 抛出 `Error('data is required')`
- 列配置中 `field` 在 data 中不存在 → 该列单元格写入空字符串（不报错，保持健壮）
- hucre 生成失败 → 透传异常到 error 状态和 error event

---

## 9. 测试策略

| 模块 | 测试要点 |
|------|----------|
| header.ts | 多级嵌套展开、depth 计算、colIndex 计算、合并范围生成 |
| merge.ts | value 合并、always 合并、custom 条件合并、连续区间处理 |
| builder.ts | 完整导出流程、hucre 交互、表头数据写入 |
| useExcelExporter.ts | loading 状态、error 状态、exportExcel 调用时序 |
| ExcelExport.vue | props 传递、slot 渲染、事件触发 |

---

## 10. 非功能性需求

- **包体积**：目标 gzip < 5KB（hucre tree-shakeable，核心引擎仅使用 writeXlsx + 样式模块）
- **浏览器兼容**：支持 Chrome/Firefox/Safari/Edge 当前主要版本
- **TypeScript 严格模式**：`strict: true`，所有类型显式定义
- **零运行时依赖**：仅 devDependencies 有 Vue3 + hucre
