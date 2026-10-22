import { describe, expect, it } from 'vitest'
import {
  budgetStatus,
  daysLeft,
  percentUsed,
  remaining,
  safePerDay,
  sortByStatus,
  todayPercent,
} from './budgets'

describe('budgetStatus', () => {
  it.each([
    [0, 'on-track'],
    [8499, 'on-track'], // 84.99%
    [8500, 'near-limit'], // 85%
    [10000, 'near-limit'], // 100%
    [10001, 'over-budget'], // 100.01%
  ])('spent %i of 10000 is %s', (spent, status) => {
    expect(budgetStatus(spent, 10000)).toBe(status)
  })
})

describe('remaining', () => {
  it('is what is left, and negative once overspent', () => {
    expect(remaining(15_000_000, 10_400_000)).toBe(4_600_000)
    expect(remaining(1000, 1500)).toBe(-500)
  })
})

describe('percentUsed', () => {
  it('gives whole percents', () => {
    expect(percentUsed(10_400_000, 15_000_000)).toBe(69)
    expect(percentUsed(0, 1000)).toBe(0)
  })

  it('never contradicts the status badge at a boundary', () => {
    // 84.6% is still On track, so it must not read 85%.
    expect(percentUsed(8460, 10000)).toBe(84)
    expect(budgetStatus(8460, 10000)).toBe('on-track')
    expect(percentUsed(8500, 10000)).toBe(85)
    expect(percentUsed(10000, 10000)).toBe(100)
    // 100.4% is Over budget, so it must not read 100%.
    expect(percentUsed(10040, 10000)).toBe(101)
    expect(budgetStatus(10040, 10000)).toBe('over-budget')
  })
})

describe('daysLeft', () => {
  it('counts the days after today', () => {
    expect(daysLeft('2026-10-16')).toBe(15)
    expect(daysLeft('2026-10-31')).toBe(0)
    expect(daysLeft('2026-02-01')).toBe(27)
  })
})

describe('todayPercent', () => {
  it('is the day over the days in the month', () => {
    expect(todayPercent('2026-10-31')).toBe(100)
    expect(todayPercent('2026-02-14')).toBe(50)
  })
})

describe('safePerDay', () => {
  it('rounds down to 1.000 ₫', () => {
    expect(safePerDay(4_600_000, 15)).toBe(306_000)
  })

  it('shows the whole remaining amount on the last day', () => {
    expect(safePerDay(4_600_500, 0)).toBe(4_600_000)
  })

  it('is 0 once the budget is spent', () => {
    expect(safePerDay(0, 15)).toBe(0)
    expect(safePerDay(-500, 15)).toBe(0)
  })
})

describe('sortByStatus', () => {
  it('puts Over budget first, then Near limit, then by % used', () => {
    const rows = [
      { id: 'a', spent: 100, budget: 1000 }, // 10%
      { id: 'b', spent: 900, budget: 1000 }, // 90% near
      { id: 'c', spent: 1500, budget: 1000 }, // 150% over
      { id: 'd', spent: 500, budget: 1000 }, // 50%
      { id: 'e', spent: 1100, budget: 1000 }, // 110% over
    ]

    expect(sortByStatus(rows).map((row) => row.id)).toEqual(['c', 'e', 'b', 'd', 'a'])
  })
})
