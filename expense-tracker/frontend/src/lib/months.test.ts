import { describe, expect, it } from 'vitest'
import { currentMonth, formatMonthLabel, percentChange, shiftMonth, sharePercent } from './months'

describe('currentMonth', () => {
  it('takes the year and month from today', () => {
    expect(currentMonth('2026-10-16')).toBe('2026-10')
  })
})

describe('shiftMonth', () => {
  it('moves by one month', () => {
    expect(shiftMonth('2026-10', -1)).toBe('2026-09')
    expect(shiftMonth('2026-10', 1)).toBe('2026-11')
  })

  it('crosses year boundaries', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2025-12', 1)).toBe('2026-01')
    expect(shiftMonth('2026-03', -15)).toBe('2024-12')
  })
})

describe('formatMonthLabel', () => {
  it('writes the month name and year', () => {
    expect(formatMonthLabel('2026-10')).toBe('October 2026')
    expect(formatMonthLabel('2026-01')).toBe('January 2026')
  })
})

describe('percentChange', () => {
  it('rounds to a whole percent', () => {
    expect(percentChange(1100, 1000)).toBe(10)
    expect(percentChange(500, 1000)).toBe(-50)
    expect(percentChange(1000, 1000)).toBe(0)
    expect(percentChange(1, 3)).toBe(-67)
  })

  it('is null when there is no previous spending', () => {
    expect(percentChange(500, 0)).toBeNull()
  })
})

describe('sharePercent', () => {
  it('is the rounded share of the whole', () => {
    expect(sharePercent(1, 3)).toBe(33)
    expect(sharePercent(2, 3)).toBe(67)
  })

  it('is 0 for an empty whole', () => {
    expect(sharePercent(0, 0)).toBe(0)
  })
})
