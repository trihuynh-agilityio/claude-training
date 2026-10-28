import { describe, expect, it } from 'vitest'
import type { Budget, MonthlySummary } from '../types'
import type { CategoryId } from './categories'
import {
  alertText,
  budgetAlerts,
  budgetStatus,
  daysLeft,
  newlyOver,
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

const MILLION = 1_000_000

function budgetOf(monthly: number, categories: Partial<Record<CategoryId, number>> = {}): Budget {
  return { month: '2026-10', source_month: '2026-10', is_own: true, monthly, categories }
}

function summaryOf(
  spent: Partial<Record<CategoryId, number>>,
  budget: Budget | null,
  total?: number,
): MonthlySummary {
  const categories = Object.entries(spent).map(([id, amount]) => ({
    category_id: id as CategoryId,
    total: amount as number,
    count: 1,
  }))
  return {
    month: '2026-10',
    total: total ?? categories.reduce((sum, row) => sum + row.total, 0),
    count: categories.length,
    same_day_last_month_total: 0,
    categories,
    budget,
  }
}

const names = (items: { name: string }[]) => items.map((item) => item.name)

describe('budgetAlerts', () => {
  it('ignores unbudgeted categories and counts a budgeted one without a row as 0', () => {
    const result = budgetAlerts(
      summaryOf(
        { food: 2 * MILLION, shopping: 9 * MILLION },
        budgetOf(100 * MILLION, { food: MILLION, bills: MILLION }),
      ),
    )
    expect(names(result.over)).toEqual(['Food & Dining'])
    expect(result.near).toEqual([])
  })

  it('gives empty lists without a budget', () => {
    expect(budgetAlerts(summaryOf({ food: MILLION }, null))).toEqual({ over: [], near: [] })
  })

  it('gives empty lists for a month with no expenses', () => {
    expect(budgetAlerts(summaryOf({}, budgetOf(MILLION)))).toEqual({ over: [], near: [] })
  })

  it.each([
    [849_999, 'none'],
    [850_000, 'near'],
    [1_000_000, 'near'],
    [1_000_001, 'over'],
  ])('spent %i of 1.000.000 is %s', (spent, expected) => {
    const result = budgetAlerts(summaryOf({ other: spent }, budgetOf(MILLION)))
    const where = result.over.length ? 'over' : result.near.length ? 'near' : 'none'
    expect(where).toBe(expected)
  })

  it.each([
    [849_999, 'none'],
    [850_000, 'near'],
    [1_000_000, 'near'],
    [1_000_001, 'over'],
  ])('a category spent %i of 1.000.000 is %s', (spent, expected) => {
    const result = budgetAlerts(
      summaryOf({ food: spent }, budgetOf(100 * MILLION, { food: MILLION })),
    )
    const where = result.over.length ? 'over' : result.near.length ? 'near' : 'none'
    expect(where).toBe(expected)
  })

  it('skips a monthly or category budget of 0 or less', () => {
    for (const limit of [0, -5]) {
      const result = budgetAlerts(summaryOf({ food: MILLION }, budgetOf(limit, { food: limit })))
      expect(result).toEqual({ over: [], near: [] })
    }
  })

  it('gives no strip when count is 0 even if the total is above 0', () => {
    const summary = { ...summaryOf({}, budgetOf(MILLION), 2 * MILLION), count: 0 }
    expect(budgetAlerts(summary)).toEqual({ over: [], near: [] })
  })

  it('skips a category whose limit is undefined', () => {
    const budget = budgetOf(100 * MILLION, { food: undefined })
    expect(budgetAlerts(summaryOf({ food: 5 * MILLION }, budget))).toEqual({ over: [], near: [] })
  })

  it('breaks a tie on percent used with the monthly budget first, then the budget key order', () => {
    const budget = budgetOf(2 * MILLION, { shopping: MILLION, food: MILLION })
    const result = budgetAlerts(summaryOf({ food: MILLION, shopping: MILLION }, budget))
    expect(names(result.near)).toEqual(['Monthly budget', 'Shopping', 'Food & Dining'])
  })

  it('orders each list by percent used, highest first', () => {
    const result = budgetAlerts(
      summaryOf(
        { shopping: 900_000, bills: 950_000, transport: 1_200_000, food: 2_000_000 },
        budgetOf(100 * MILLION, {
          shopping: MILLION,
          bills: MILLION,
          transport: MILLION,
          food: MILLION,
        }),
      ),
    )
    expect(names(result.over)).toEqual(['Food & Dining', 'Transport'])
    expect(names(result.near)).toEqual(['Bills & Utilities', 'Shopping'])
  })

  it('puts the monthly budget among the items by percent used', () => {
    const result = budgetAlerts(
      summaryOf(
        { food: 1_500_000, bills: 900_000 },
        budgetOf(2 * MILLION, { food: MILLION, bills: MILLION }),
      ),
    )
    expect(names(result.over)).toEqual(['Food & Dining', 'Monthly budget'])
    expect(names(result.near)).toEqual(['Bills & Utilities'])
  })
})

describe('alertText', () => {
  it('lists over then near', () => {
    expect(alertText(['Food & Dining', 'Monthly budget'], ['Bills & Utilities'])).toBe(
      'Over budget: Food & Dining, Monthly budget. Near limit: Bills & Utilities.',
    )
  })
  it('leaves out an empty list', () => {
    expect(alertText(['Food & Dining'], [])).toBe('Over budget: Food & Dining.')
    expect(alertText([], ['Bills & Utilities'])).toBe('Near limit: Bills & Utilities.')
  })
  it('is empty with no names', () => {
    expect(alertText([], [])).toBe('')
  })
})

describe('newlyOver', () => {
  const limits = budgetOf(100 * MILLION, { food: MILLION, bills: MILLION, shopping: MILLION })

  it('skips items already over budget', () => {
    const before = summaryOf({ food: 1_200_000 }, limits)
    expect(newlyOver(before, summaryOf({ food: 1_500_000 }, limits))).toEqual([])
  })
  it('skips an item that only moves to near limit', () => {
    expect(
      newlyOver(summaryOf({ food: 500_000 }, limits), summaryOf({ food: 900_000 }, limits)),
    ).toEqual([])
  })
  it('includes an item moving from near to over', () => {
    expect(
      newlyOver(summaryOf({ food: 900_000 }, limits), summaryOf({ food: 1_100_000 }, limits)),
    ).toEqual(['Food & Dining'])
  })
  it('includes an item that is new to after', () => {
    const after = budgetOf(100 * MILLION, { food: MILLION, bills: 500_000 })
    expect(
      newlyOver(
        summaryOf({ bills: 700_000 }, budgetOf(100 * MILLION, { food: MILLION })),
        summaryOf({ bills: 700_000 }, after),
      ),
    ).toEqual(['Bills & Utilities'])
  })
  it('treats a before without a budget as nothing over', () => {
    expect(
      newlyOver(summaryOf({ food: 2 * MILLION }, null), summaryOf({ food: 2 * MILLION }, limits)),
    ).toEqual(['Food & Dining'])
  })
  it('orders the result like the strip', () => {
    const before = summaryOf({}, limits)
    const after = summaryOf({ shopping: 1_300_000, food: 2_000_000 }, limits)
    expect(newlyOver(before, after)).toEqual(['Food & Dining', 'Shopping'])
  })
  it('tells apart two items that share a display name', () => {
    // An unknown id falls back to the name "Other", the same as the real "other" category.
    const unknown = { other: MILLION, mystery: MILLION } as unknown as Partial<
      Record<CategoryId, number>
    >
    const budget = budgetOf(100 * MILLION, unknown)
    const before = summaryOf({ other: 2 * MILLION }, budget)
    const after = {
      ...before,
      categories: [
        ...before.categories,
        { category_id: 'mystery' as CategoryId, total: 2 * MILLION, count: 1 },
      ],
    }
    expect(newlyOver(before, after)).toEqual(['Other'])
  })
})
