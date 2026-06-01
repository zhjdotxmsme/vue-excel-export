# vue-excel-export — Agent Guide

## Commands

```bash
npm run typecheck    # vue-tsc --noEmit (run before build)
npm test             # vitest run
npm run test:watch   # vitest (watch mode)
npm run build        # typecheck → vite build (lib mode, dts generated)
cd example && npm run dev  # demo app
```

Always run `typecheck` before `build`. The build script does this automatically; do not skip it if you run `vite build` directly.

## Architecture

```
src/
├── types/           # ColumnConfig, CellStyle, MergeRule, ExportOptions
├── engine/          # Pure TS, zero Vue dependency (testable in Node)
│   ├── header.ts    # Recursive ColumnConfig → flat leaves + header merges
│   ├── styler.ts    # CellStyle → hucre CellStyle mapping
│   ├── merge.ts     # value/always/custom merge range calculation
│   └── builder.ts   # Orchestration: hucre WorkbookBuilder → Uint8Array
├── composables/     # Vue3 refs wrapping engine calls
└── components/      # Vue SFC (ExcelExport.vue)
```

Entry: `src/index.ts` (exports types, engine utils, hook, component).

## Key Conventions

### ColumnConfig discrimination
- `LeafColumn` has `field: string`; `GroupColumn` has `children: ColumnConfig[]`
- Engine checks `'field' in col` to distinguish them

### Style mapping to hucre
- Hex colors `#RRGGBB` → stripped to `RRGGBB` (hucre's `Color.rgb` format)
- `verticalAlign: 'middle'` → `'center'` (hucre does not support `'middle'`)
- `border: true` → `{ style: 'thin' }` (no color)
- Background color → `PatternFill` with `pattern: 'solid'`

### Style priority (highest to lowest)
1. `ExportOptions.headerStyle` / `cellStyle` (global overrides — beats all)
2. `ColumnConfig.style` (per-column override)
3. Group header default (`#D9E2F3`)
4. Built-in defaults (`#F0F0F0` headers, thin borders)

### Header flattening logic
- All leaf columns occupy the last header row (`maxDepth - 1`)
- Leaves above the bottom row get a `HeaderMergeRange` at their natural depth
- Group headers are single-row horizontal merges
- `buildHeaderGrid()` produces a `string[][]` mapping all header text positions

### Column width
- `autoColumnWidth: true` (default) — hucre calculates optimal width from all cell content (CJK-aware)
- Explicit `width` on a column serves as a minimum when `autoWidth` is also set
- Set `autoColumnWidth: false` to use Excel default width or fixed `width` values

### Merge rules
- `type: 'value'` — adjacent rows with equal values merge
- `type: 'always'` — entire column merges into one cell (skipped for single-row data)
- `type: 'custom'` — `when(current, next, rowIndex)` returns true to merge, false to split

## Testing

- Tests in `test/*.test.ts`, Vitest globals enabled
- Environment: `node` (no jsdom/browser) — engine is pure TS
- 3 test files: `header.test.ts` (6 tests), `merge.test.ts` (10 tests), `builder.test.ts` (6 tests)
- Builder tests verify hucre produces valid `Uint8Array` output (no content assertions)
- `makeFlatColumn()` helper in merge tests

## Package Structure

- **Library** (Vite lib mode), not an app. Entry: `src/index.ts`
- `vue` and `hucre` are externals (peer dependencies for consumers)
- `hucre ^0.3.0` — zero-dependency spreadsheet engine
- `vite-plugin-dts` generates declaration files automatically
- Ignored: `docs/superpowers/` (AI-generated design docs)

## hucre Known Issue

`hucre` v0.3.0 type definitions reference `ErrorOptions` (TS 5.2+). Projects on older TS may get a type error from hucre's `.d.mts` — not a problem with this library. Use `skipLibCheck: true` (already set in tsconfig).
