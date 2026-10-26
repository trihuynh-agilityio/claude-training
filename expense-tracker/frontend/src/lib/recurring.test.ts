import { describe, expect, it } from 'vitest'
import type { Recurring } from '../types'
import {
  countDue,
  dayLabel,
  earliestStart,
  nextDue,
  occurrenceInMonth,
  occurrences,
  ruleStatus,
} from './recurring'

function rule(overrides: Partial<Recurring> = {}): Recurring {
  return {
    id: 1,
    amount: 5_000_000,
    category_id: 'bills',
    note: 'Rent',
    day: 1,
    start_date: '2026-08-01',
    end_date: null,
    paused: false,
    last_generated: null,
    next_due: null,
    ...overrides,
  }
}

describe('occurrenceInMonth', () => {
  it('clamps day 31 to the month length', () => {
    expect(occurrenceInMonth(31, 2027, 2)).toBe('2027-02-28')
    expect(occurrenceInMonth(31, 2028, 2)).toBe('2028-02-29')
    expect(occurrenceInMonth(31, 2026, 4)).toBe('2026-04-30')
    expect(occurrenceInMonth(31, 2026, 5)).toBe('2026-05-31')
  })
})

describe('occurrences', () => {
  it('starts on the first matching date on or after the start date', () => {
    expect(occurrences(15, '2026-10-16', null, null, '2026-12-31')).toEqual([
      '2026-11-15',
      '2026-12-15',
    ])
    expect(occurrences(15, '2026-10-15', null, null, '2026-10-31')).toEqual(['2026-10-15'])
  })

  it('stops at the end date and skips handled dates', () => {
    expect(occurrences(5, '2026-01-01', '2026-03-05', null, null)).toEqual([
      '2026-01-05',
      '2026-02-05',
      '2026-03-05',
    ])
    expect(occurrences(5, '2026-01-01', null, '2026-02-05', '2026-04-30')).toEqual([
      '2026-03-05',
      '2026-04-05',
    ])
  })

  it('crosses a year end', () => {
    expect(occurrences(10, '2026-11-01', null, null, '2027-01-31')).toEqual([
      '2026-11-10',
      '2026-12-10',
      '2027-01-10',
    ])
  })
})

describe('nextDue and ruleStatus', () => {
  it('is the first occurrence when nothing was handled', () => {
    expect(nextDue(rule())).toBe('2026-08-01')
  })

  it('moves past the last handled occurrence', () => {
    expect(nextDue(rule({ last_generated: '2026-10-01' }))).toBe('2026-11-01')
  })

  it('shows the last day for day 31 in a short month', () => {
    expect(nextDue(rule({ day: 31, start_date: '2027-02-01' }))).toBe('2027-02-28')
  })

  it('reports Paused and Ended', () => {
    expect(ruleStatus(rule({ paused: true }))).toEqual({ kind: 'paused' })
    expect(ruleStatus(rule({ end_date: '2026-09-15', last_generated: '2026-09-01' }))).toEqual({
      kind: 'ended',
    })
    expect(ruleStatus(rule())).toEqual({ kind: 'due', date: '2026-08-01' })
  })
})

describe('labels and limits', () => {
  it('labels the day', () => {
    expect(dayLabel(31)).toBe('Day 31 of every month')
  })

  it('finds the earliest allowed start date', () => {
    expect(earliestStart('2026-10-16')).toBe('2024-10-16')
    expect(earliestStart('2026-01-31')).toBe('2024-01-31')
    expect(earliestStart('2028-02-29')).toBe('2026-02-28')
  })

  it('counts the expenses a new rule adds', () => {
    expect(countDue(1, '2026-08-01', null, '2026-10-16')).toBe(3)
    expect(countDue(20, '2026-10-01', null, '2026-10-16')).toBe(0)
  })
})

describe('years before 100', () => {
  it('keeps the year instead of mapping it to the 1900s', () => {
    expect(occurrenceInMonth(31, 26, 1)).toBe('0026-01-31')
    expect(occurrenceInMonth(31, 24, 2)).toBe('0024-02-29')
  })
})
