import { describe, expect, it } from 'vitest'
import {
  addDays,
  formatDayLabel,
  formatLongDate,
  formatShortDate,
  groupByDay,
  todayISO,
} from './dates'

const TODAY = '2026-10-16'

describe('todayISO', () => {
  it('uses the local calendar date', () => {
    expect(todayISO(new Date(2026, 9, 16, 23, 59))).toBe('2026-10-16')
    expect(todayISO(new Date(2026, 0, 5, 0, 1))).toBe('2026-01-05')
  })
})

describe('addDays', () => {
  it('crosses month and year boundaries', () => {
    expect(addDays('2026-10-01', -1)).toBe('2026-09-30')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })
})

describe('formatDayLabel', () => {
  it('labels today and yesterday', () => {
    expect(formatDayLabel('2026-10-16', TODAY)).toBe('Today · Fri 16 Oct')
    expect(formatDayLabel('2026-10-15', TODAY)).toBe('Yesterday · Thu 15 Oct')
  })

  it('uses the short date for older days', () => {
    expect(formatDayLabel('2026-10-14', TODAY)).toBe('Wed 14 Oct')
    expect(formatShortDate('2026-09-28')).toBe('Mon 28 Sep')
  })
})

describe('groupByDay', () => {
  const expenses = [
    { id: 3, date: '2026-10-16', amount: 65_000 },
    { id: 2, date: '2026-10-16', amount: 48_000 },
    { id: 1, date: '2026-10-14', amount: 412_000 },
  ]

  it('groups consecutive days with a subtotal and keeps the order', () => {
    const groups = groupByDay(expenses, TODAY)

    expect(groups.map((g) => g.label)).toEqual(['Today · Fri 16 Oct', 'Wed 14 Oct'])
    expect(groups.map((g) => g.total)).toEqual([113_000, 412_000])
    expect(groups[0].items.map((e) => e.id)).toEqual([3, 2])
  })

  it('returns no groups for no expenses', () => {
    expect(groupByDay([], TODAY)).toEqual([])
  })
})

describe('formatLongDate', () => {
  it('spells out the weekday and month', () => {
    expect(formatLongDate('2026-10-16')).toBe('Friday, 16 October 2026')
  })
})
