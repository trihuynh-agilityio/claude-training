import type { Recurring } from '../types'
import { toISODate } from './dates'

/** How far back a start date may be, relative to today. */
export const MAX_MONTHS_BACK = 24

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

/** The rule's date in a month (month is 1 to 12); short months use their last day. */
export function occurrenceInMonth(day: number, year: number, month: number): string {
  return toISODate(new Date(year, month - 1, Math.min(day, daysInMonth(year, month))))
}

/** Occurrence dates from `start`, later than `after`, not past `end` or `upTo`. Mirrors the backend. */
export function occurrences(
  day: number,
  start: string,
  end: string | null,
  after: string | null,
  upTo: string | null,
  limit = 1000,
): string[] {
  const found: string[] = []
  let year = Number(start.slice(0, 4))
  let month = Number(start.slice(5, 7))
  while (found.length < limit) {
    const date = occurrenceInMonth(day, year, month)
    if ((end && date > end) || (upTo && date > upTo)) break
    if (date >= start && (!after || date > after)) found.push(date)
    if (month === 12) [year, month] = [year + 1, 1]
    else month += 1
  }
  return found
}

/** The next occurrence not yet handled, or null once the end date has passed. */
export function nextDue(
  rule: Pick<Recurring, 'day' | 'start_date' | 'end_date' | 'last_generated'>,
): string | null {
  return (
    occurrences(rule.day, rule.start_date, rule.end_date, rule.last_generated, null, 1)[0] ?? null
  )
}

export type RuleStatus = { kind: 'paused' } | { kind: 'ended' } | { kind: 'due'; date: string }

export function ruleStatus(rule: Recurring): RuleStatus {
  if (rule.paused) return { kind: 'paused' }
  const date = nextDue(rule)
  return date ? { kind: 'due', date } : { kind: 'ended' }
}

/** "Day 5 of every month". */
export function dayLabel(day: number): string {
  return `Day ${day} of every month`
}

/** The earliest start date allowed today: the same day 24 months back, clamped to month length. */
export function earliestStart(today: string): string {
  const total = Number(today.slice(0, 4)) * 12 + Number(today.slice(5, 7)) - 1 - MAX_MONTHS_BACK
  return occurrenceInMonth(Number(today.slice(8, 10)), Math.floor(total / 12), (total % 12) + 1)
}

/** How many expenses saving a rule would add right now. */
export function countDue(day: number, start: string, end: string | null, today: string): number {
  return occurrences(day, start, end, null, today).length
}
