import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FILTERS,
  filterExpenses,
  normalizeText,
  rangeBounds,
  validateRange,
  type Filters,
} from './filters'

const TODAY = '2026-10-16'

describe('rangeBounds', () => {
  it('covers the current month up to today', () => {
    expect(rangeBounds('this-month', TODAY)).toEqual({ from: '2026-10-01', to: '2026-10-16' })
    expect(rangeBounds('this-month', '2026-10-01')).toEqual({
      from: '2026-10-01',
      to: '2026-10-01',
    })
  })

  it('covers the last 7 days including today, across month and year edges', () => {
    expect(rangeBounds('last-7-days', TODAY)).toEqual({ from: '2026-10-10', to: '2026-10-16' })
    expect(rangeBounds('last-7-days', '2026-03-02')).toEqual({
      from: '2026-02-24',
      to: '2026-03-02',
    })
    expect(rangeBounds('last-7-days', '2027-01-03')).toEqual({
      from: '2026-12-28',
      to: '2027-01-03',
    })
  })

  it('covers the whole previous month, across year edges and leap years', () => {
    expect(rangeBounds('last-month', TODAY)).toEqual({ from: '2026-09-01', to: '2026-09-30' })
    expect(rangeBounds('last-month', '2026-10-31')).toEqual({
      from: '2026-09-01',
      to: '2026-09-30',
    })
    expect(rangeBounds('last-month', '2027-01-01')).toEqual({
      from: '2026-12-01',
      to: '2026-12-31',
    })
    expect(rangeBounds('last-month', '2028-03-15')).toEqual({
      from: '2028-02-01',
      to: '2028-02-29',
    })
  })

  it('leaves Custom to its own From/To', () => {
    expect(rangeBounds('custom', TODAY)).toBeNull()
  })
})

describe('validateRange', () => {
  it('rejects From after To', () => {
    expect(validateRange('2026-10-16', '2026-10-01')).toBe(
      'From date must be on or before To date.',
    )
  })

  it('accepts equal, ordered or open-ended dates', () => {
    expect(validateRange('2026-10-01', '2026-10-01')).toBeUndefined()
    expect(validateRange('2026-10-01', '2026-10-16')).toBeUndefined()
    expect(validateRange('', '2026-10-01')).toBeUndefined()
    expect(validateRange('2026-10-16', '')).toBeUndefined()
  })
})

describe('normalizeText', () => {
  it('drops case, diacritics and đ', () => {
    expect(normalizeText('Phở bò')).toBe('pho bo')
    expect(normalizeText('Điện — Bách Hóa Xanh')).toBe('dien — bach hoa xanh')
  })
})

describe('filterExpenses', () => {
  const expenses = [
    { id: 5, date: '2026-10-16', note: 'Phở bò — breakfast' },
    { id: 4, date: '2026-10-16', note: 'Grab to office' },
    { id: 3, date: '2026-10-14', note: 'Groceries — Bách Hóa Xanh' },
    { id: 2, date: '2026-09-30', note: 'Tiền điện tháng 9' },
    { id: 1, date: '2026-08-20', note: null },
  ]
  const ids = (filters: Partial<Filters>) =>
    filterExpenses(expenses, { ...DEFAULT_FILTERS, ...filters }, TODAY).map((e) => e.id)

  it('defaults to this month with no search', () => {
    expect(ids({})).toEqual([5, 4, 3])
  })

  it('matches the note with or without diacritics, ignoring case', () => {
    expect(ids({ query: 'pho' })).toEqual([5])
    expect(ids({ query: 'PHỞ' })).toEqual([5])
    expect(ids({ query: 'bach hoa' })).toEqual([3])
    expect(ids({ query: 'dien', range: 'last-month' })).toEqual([2])
    expect(ids({ query: '  grab ' })).toEqual([4])
  })

  it('skips expenses without a note when searching', () => {
    expect(ids({ query: 'a', range: 'custom' })).toEqual([5, 4, 3, 2])
  })

  it('applies each preset range', () => {
    expect(ids({ range: 'last-7-days' })).toEqual([5, 4, 3])
    expect(ids({ range: 'last-month' })).toEqual([2])
  })

  it('applies a custom range, open on either side', () => {
    expect(ids({ range: 'custom', from: '2026-09-30', to: '2026-10-14' })).toEqual([3, 2])
    expect(ids({ range: 'custom', to: '2026-09-30' })).toEqual([2, 1])
    expect(ids({ range: 'custom' })).toEqual([5, 4, 3, 2, 1])
  })

  it('matches nothing when From is after To', () => {
    expect(ids({ range: 'custom', from: '2026-10-16', to: '2026-10-01' })).toEqual([])
  })
})
