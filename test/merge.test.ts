import { describe, it, expect } from 'vitest'
import { calculateMerges, optimizeMerges } from '../src/engine/merge'
import type { FlatColumn } from '../src/types'

function makeFlatColumn(overrides: Partial<FlatColumn> = {}): FlatColumn {
  return {
    title: 'col',
    field: 'col',
    colIndex: 0,
    rowIndex: 0,
    depth: 1,
    ...overrides,
  }
}

describe('calculateMerges', () => {
  it('returns empty for no merge rules', () => {
    const cols = [makeFlatColumn()]
    const data = [{ col: 'a' }, { col: 'b' }]
    const merges = calculateMerges(cols, data, 1)
    expect(merges).toHaveLength(0)
  })

  it('creates full column merge for type always', () => {
    const cols = [makeFlatColumn({ merge: { type: 'always' } })]
    const data = [{ col: 'a' }, { col: 'b' }, { col: 'c' }]
    const merges = calculateMerges(cols, data, 2)
    expect(merges).toHaveLength(1)
    expect(merges[0]).toMatchObject({ startRow: 2, startCol: 0, endRow: 4, endCol: 0 })
  })

  it('does not merge single row for type always', () => {
    const cols = [makeFlatColumn({ merge: { type: 'always' } })]
    const data = [{ col: 'a' }]
    const merges = calculateMerges(cols, data, 1)
    expect(merges).toHaveLength(0)
  })

  it('merges adjacent identical values for type value', () => {
    const cols = [makeFlatColumn({ merge: { type: 'value' } })]
    const data = [
      { col: 'a' },
      { col: 'a' },
      { col: 'b' },
      { col: 'b' },
      { col: 'b' },
      { col: 'c' },
    ]
    const merges = calculateMerges(cols, data, 1)
    // a-a merge (rows 1-2), b-b-b merge (rows 3-5)
    expect(merges).toHaveLength(2)
    expect(merges[0]).toMatchObject({ startRow: 1, startCol: 0, endRow: 2, endCol: 0 })
    expect(merges[1]).toMatchObject({ startRow: 3, startCol: 0, endRow: 5, endCol: 0 })
  })

  it('does not merge different adjacent values for type value', () => {
    const cols = [makeFlatColumn({ merge: { type: 'value' } })]
    const data = [{ col: 'a' }, { col: 'b' }, { col: 'c' }]
    const merges = calculateMerges(cols, data, 1)
    expect(merges).toHaveLength(0)
  })

  it('supports custom when function', () => {
    const cols = [
      makeFlatColumn({
        merge: {
          type: 'custom',
          when: (current: unknown, _next: unknown, _idx: number) => {
            return (current as number) % 2 === 1 // merge odd values
          },
        },
      }),
    ]
    const data = [{ col: 1 }, { col: 1 }, { col: 3 }, { col: 4 }]
    const merges = calculateMerges(cols, data, 1)
    // when(current=1, next=1) -> true → merge row 1 with 2
    // when(current=1, next=3) -> true → merge row 2 with 3
    // when(current=3, next=4) -> true → merge row 3 with 4
    // All odd values result in merge, so rows 1-4 all merged
    expect(merges).toHaveLength(1)
    expect(merges[0]).toMatchObject({ startRow: 1, startCol: 0, endRow: 4, endCol: 0 })
  })

  it('respects headerDepth offset', () => {
    const cols = [makeFlatColumn({ merge: { type: 'value' } })]
    const data = [{ col: 'x' }, { col: 'x' }]
    const merges = calculateMerges(cols, data, 3) // 3 header rows
    expect(merges[0]).toMatchObject({ startRow: 3, startCol: 0, endRow: 4, endCol: 0 })
  })
})

describe('optimizeMerges', () => {
  it('merges adjacent continuous ranges in same column', () => {
    const merges = [
      { startRow: 1, startCol: 0, endRow: 3, endCol: 0 },
      { startRow: 4, startCol: 0, endRow: 5, endCol: 0 },
    ]
    const result = optimizeMerges(merges)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ startRow: 1, startCol: 0, endRow: 5, endCol: 0 })
  })

  it('keeps non-adjacent ranges separate', () => {
    const merges = [
      { startRow: 1, startCol: 0, endRow: 2, endCol: 0 },
      { startRow: 5, startCol: 0, endRow: 6, endCol: 0 },
    ]
    const result = optimizeMerges(merges)
    expect(result).toHaveLength(2)
  })

  it('keeps cross-column merges unchanged', () => {
    const merges = [
      { startRow: 0, startCol: 0, endRow: 0, endCol: 2 },
      { startRow: 1, startCol: 0, endRow: 1, endCol: 2 },
    ]
    const result = optimizeMerges(merges)
    expect(result).toHaveLength(2)
  })
})
