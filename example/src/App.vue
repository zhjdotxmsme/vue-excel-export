<template>
  <div class="app">
    <h1>Vue Excel Export 示例</h1>

    <!-- ========== 示例1: 简单表格导出 ========== -->
    <section class="demo-section">
      <h2>1. 基础导出 — 简单表头</h2>
      <p>单列表头，后端返回 JSON 直接导出</p>
      <ExcelExport
        :columns="simpleColumns"
        :data="simpleData"
        filename="用户列表.xlsx"
        @before-export="(console.log('导出开始'))"
        @after-export="(console.log('导出完成'))"
        @error="(e: any) => console.error(e)"
      >
        <template #trigger="{ exportExcel, loading }">
          <button :disabled="loading" class="btn" @click="exportExcel">
            {{ loading ? '导出中...' : '导出用户列表' }}
          </button>
        </template>
      </ExcelExport>
    </section>

    <!-- ========== 示例2: 分组表头 ========== -->
    <section class="demo-section">
      <h2>2. 分组表头 — 多级嵌套</h2>
      <p>"个人信息" 下含 年龄/性别，"业绩"下含 Q1/Q2/Q3</p>
      <ExcelExport
        :columns="groupColumns"
        :data="groupData"
        filename="销售业绩报表.xlsx"
        :header-style="{ bgColor: '#4472C4', fontColor: '#FFFFFF', bold: true }"
      >
        <template #trigger="{ exportExcel, loading }">
          <button :disabled="loading" class="btn primary" @click="exportExcel">
            {{ loading ? '导出中...' : '导出业绩报表' }}
          </button>
        </template>
      </ExcelExport>
    </section>

    <!-- ========== 示例3: 数据合并 ========== -->
    <section class="demo-section">
      <h2>3. 列合并 — 部门相同值自动合并</h2>
      <p>"部门" 列 type=value 合并，"备注" 列 type=always 整列合并</p>
      <button class="btn success" @click="handleMergeExport">
        {{ mergeLoading ? '导出中...' : '导出合并报表' }}
      </button>
    </section>

    <!-- ========== 示例4: 纯 Hook 调用 ========== -->
    <section class="demo-section">
      <h2>4. Hook 方式 — 编程式导出</h2>
      <p>使用 <code>useExcelExporter()</code> 完全控制导出流程</p>
      <button class="btn" :disabled="hookLoading" @click="handleHookExport">
        {{ hookLoading ? '导出中...' : '编程式导出' }}
      </button>
      <button class="btn danger" @click="handleStyleExport">
        带样式导出
      </button>
    </section>

    <!-- ========== 示例5: 3 级嵌套表头 ========== -->
    <section class="demo-section">
      <h2>5. 三层嵌套表头</h2>
      <p>总体 → 区域(省份/城市) + 销售额</p>
      <ExcelExport
        :columns="deepColumns"
        :data="deepData"
        filename="三层嵌套导出.xlsx"
        :header-style="{ bgColor: '#2E75B6', fontColor: '#FFFFFF' }"
      >
        <template #trigger="{ exportExcel, loading }">
          <button :disabled="loading" class="btn" @click="exportExcel">
            {{ loading ? '导出中...' : '导出三层表头' }}
          </button>
        </template>
      </ExcelExport>
    </section>
    <!-- ========== 示例6: 分页导出大数据 ========== -->
    <section class="demo-section">
      <h2>6. 分页导出 — 大批量数据</h2>
      <p>
        模拟 5000 条订单数据，每批 500 条分 10 批逐页获取后组装为
        <code>.xlsx</code>
      </p>

      <div v-if="progress" class="progress-bar-wrapper">
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: (progress.fetched / progress.total * 100) + '%' }"
          />
        </div>
        <span class="progress-text">
          第 {{ progress.page }}/{{ progress.totalPages }} 页
          · {{ progress.fetched }}/{{ progress.total }} 条
        </span>
      </div>

      <ExcelExport
        :columns="orderColumns"
        :pagination="{
          pageSize: 500,
          fetch: mockOrderFetch,
        }"
        filename="大批量订单导出.xlsx"
        :on-progress="handleProgress"
        @before-export="beforePaginationExport"
        @after-export="afterPaginationExport"
        @error="(e: any) => console.error(e)"
      >
        <template #trigger="{ exportExcel, loading }">
          <button :disabled="loading" class="btn primary" @click="exportExcel">
            {{ loading ? '导出中...' : '导出 5000 条订单' }}
          </button>
        </template>
      </ExcelExport>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ExcelExport, useExcelExporter } from 'vue-excel-export'
import type { ColumnConfig } from 'vue-excel-export'

// ── 示例1: 简单表头 ──────────────────────────────────
const simpleColumns: ColumnConfig[] = [
  { title: 'ID', field: 'id', width: 60 },
  { title: '姓名', field: 'name', width: 100 },
  { title: '邮箱', field: 'email', width: 200 },
  { title: '注册时间', field: 'createdAt', width: 150 },
]

const simpleData = [
  { id: 1, name: '张三', email: 'zhangsan@example.com', createdAt: '2025-01-15' },
  { id: 2, name: '李四', email: 'lisi@example.com', createdAt: '2025-02-20' },
  { id: 3, name: '王五', email: 'wangwu@example.com', createdAt: '2025-03-10' },
]

// ── 示例2: 分组表头 ──────────────────────────────────
const groupColumns: ColumnConfig[] = [
  { title: '姓名', field: 'name', width: 100 },
  {
    title: '个人信息',
    children: [
      { title: '年龄', field: 'age', width: 60 },
      { title: '性别', field: 'gender', width: 60 },
    ],
  },
  {
    title: '业绩',
    children: [
      { title: 'Q1', field: 'q1', width: 80 },
      { title: 'Q2', field: 'q2', width: 80 },
      { title: 'Q3', field: 'q3', width: 80 },
    ],
  },
  { title: '备注', field: 'remark', width: 150 },
]

const groupData = [
  { name: '张三', age: 28, gender: '男', q1: 12000, q2: 15000, q3: 18000, remark: '优秀员工' },
  { name: '李四', age: 35, gender: '女', q1: 9000, q2: 11000, q3: 13000, remark: '新入职' },
  { name: '王五', age: 42, gender: '男', q1: 22000, q2: 25000, q3: 28000, remark: '销售总监' },
]

// ── 示例3: 合并导出 ──────────────────────────────────
const mergeColumns: ColumnConfig[] = [
  { title: '部门', field: 'dept', width: 100, merge: { type: 'value' } },
  { title: '姓名', field: 'name', width: 80 },
  { title: '职位', field: 'position', width: 120 },
  { title: '销售额', field: 'sales', width: 100 },
  { title: '备注', field: 'remark', width: 100, merge: { type: 'always' } },
]

const mergeData = [
  { dept: '技术部', name: '张三', position: '前端工程师', sales: 0, remark: '技术团队' },
  { dept: '技术部', name: '李四', position: '后端工程师', sales: 0, remark: '技术团队' },
  { dept: '市场部', name: '王五', position: '市场专员', sales: 50000, remark: '市场团队' },
  { dept: '市场部', name: '赵六', position: '市场经理', sales: 80000, remark: '市场团队' },
  { dept: '市场部', name: '钱七', position: '品牌专员', sales: 30000, remark: '市场团队' },
]

const { exportExcel: mergeExport, loading: mergeLoading } = useExcelExporter()

async function handleMergeExport() {
  await mergeExport({
    columns: mergeColumns,
    data: mergeData,
    filename: '部门合并报表.xlsx',
    headerStyle: { bgColor: '#70AD47', fontColor: '#FFFFFF' },
  })
}

// ── 示例4: Hook 导出 ──────────────────────────────────
const { exportExcel: hookExport, loading: hookLoading } = useExcelExporter()

async function handleHookExport() {
  await hookExport({
    columns: simpleColumns,
    data: simpleData,
    filename: 'hook导出示例.xlsx',
  })
}

async function handleStyleExport() {
  await hookExport({
    columns: [
      { title: '产品', field: 'product', width: 120,
        style: { bold: true, fontColor: '#2E75B6' } },
      { title: '单价', field: 'price', width: 80,
        style: { align: 'right' } },
      { title: '库存', field: 'stock', width: 80,
        style: { align: 'right' } },
    ],
    data: [
      { product: 'Widget Pro', price: 29.99, stock: 142 },
      { product: 'Gadget Max', price: 49.50, stock: 87 },
      { product: 'Super Tool', price: 99.99, stock: 23 },
    ],
    filename: '带样式导出.xlsx',
    headerStyle: { bgColor: '#2E75B6', fontColor: '#FFFFFF', bold: true },
    cellStyle: { border: { top: true, bottom: true, left: true, right: true } },
  })
}

// ── 示例5: 三层嵌套表头 ──────────────────────────────
const deepColumns: ColumnConfig[] = [
  {
    title: '总体',
    children: [
      {
        title: '区域',
        children: [
          { title: '省份', field: 'province', width: 80 },
          { title: '城市', field: 'city', width: 80 },
        ],
      },
      { title: '销售额', field: 'sales', width: 100 },
    ],
  },
  { title: '同比增长', field: 'growth', width: 100 },
]

const deepData = [
  { province: '广东', city: '深圳', sales: 500000, growth: '15%' },
  { province: '广东', city: '广州', sales: 450000, growth: '12%' },
  { province: '浙江', city: '杭州', sales: 380000, growth: '20%' },
  { province: '浙江', city: '宁波', sales: 280000, growth: '18%' },
]

// ── 示例6: 分页导出大数据 ──────────────────────────────
const orderColumns: ColumnConfig[] = [
  { title: '订单号', field: 'orderNo', width: 140 },
  { title: '客户', field: 'customer', width: 100 },
  { title: '产品', field: 'product', width: 120 },
  { title: '单价', field: 'price', width: 80, style: { align: 'right' } },
  { title: '数量', field: 'qty', width: 70, style: { align: 'right' } },
  { title: '金额', field: 'amount', width: 100, style: { align: 'right', bold: true } },
  { title: '省份', field: 'province', width: 80 },
  { title: '订单日期', field: 'date', width: 120 },
  { title: '状态', field: 'status', width: 80 },
]

const allProducts = [
  'Widget Pro', 'Gadget Max', 'Super Tool', 'Mega Kit',
  'Ultra Pack', 'Power Set', 'Elite Bundle', 'Basic Box',
]
const allStatuses = ['已发货', '已完成', '处理中', '待审核']
const allProvinces = ['北京', '上海', '广东', '浙江', '四川', '湖北', '江苏', '重庆', '陕西']

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateOrderRows(count: number, startIdx: number): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = []
  for (let i = 0; i < count; i++) {
    const idx = startIdx + i
    const price = Math.round(Math.random() * 998 + 2)
    const qty = Math.floor(Math.random() * 50 + 1)
    rows.push({
      orderNo: `ORD${String(idx).padStart(8, '0')}`,
      customer: `客户${idx}`,
      product: randomItem(allProducts),
      price,
      qty,
      amount: price * qty,
      province: randomItem(allProvinces),
      date: `2026-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
      status: randomItem(allStatuses),
    })
  }
  return rows
}

// 预生成 5000 条模拟数据，按页切分
const TOTAL_ROWS = 5000
const PAGE_SIZE = 500
const allPages: Record<string, unknown>[][] = []
for (let p = 0; p < Math.ceil(TOTAL_ROWS / PAGE_SIZE); p++) {
  const start = p * PAGE_SIZE
  const size = Math.min(PAGE_SIZE, TOTAL_ROWS - start)
  allPages.push(generateOrderRows(size, start))
}

const progress = ref<{ page: number; totalPages: number; fetched: number; total: number } | null>(null)

function handleProgress(p: { page: number; totalPages: number; fetched: number; total: number }) {
  progress.value = p
}

function beforePaginationExport() {
  progress.value = null
}

function afterPaginationExport() {
  // 保留进度在 100% 状态 2 秒后清除
  setTimeout(() => { progress.value = null }, 2000)
}

async function mockOrderFetch(page: number, pageSize: number): Promise<{ data: Record<string, unknown>[]; total: number }> {
  const idx = page - 1
  const data = idx < allPages.length ? allPages[idx] : []
  // 模拟 200~400ms 网络延迟
  await new Promise((r) => setTimeout(r, 200 + Math.random() * 200))
  return { data, total: TOTAL_ROWS }
}
</script>

<style scoped>
.app {
  max-width: 960px;
  margin: 0 auto;
  padding: 2rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.demo-section {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}
.demo-section h2 {
  margin: 0 0 0.25rem;
  font-size: 1.1rem;
  color: #333;
}
.demo-section p {
  margin: 0 0 1rem;
  font-size: 0.875rem;
  color: #666;
}
.btn {
  padding: 0.5rem 1.25rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  font-size: 0.875rem;
  margin-right: 0.5rem;
}
.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.btn.primary {
  background: #4472C4;
  color: #fff;
  border-color: #4472C4;
}
.btn.success {
  background: #70AD47;
  color: #fff;
  border-color: #70AD47;
}
.btn.danger {
  background: #C00000;
  color: #fff;
  border-color: #C00000;
}
code {
  background: #e9ecef;
  padding: 0.1em 0.3em;
  border-radius: 3px;
  font-size: 0.9em;
}
.progress-bar-wrapper {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.progress-bar {
  flex: 1;
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4472C4, #70AD47);
  border-radius: 4px;
  transition: width 0.3s ease;
}
.progress-text {
  font-size: 0.8rem;
  color: #666;
  white-space: nowrap;
}
</style>
