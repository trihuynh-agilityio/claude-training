import { MONTH_NAMES, todayISO } from './dates'

/** A month as "YYYY-MM". */
export function currentMonth(today: string = todayISO()): string {
  return today.slice(0, 7)
}

export function shiftMonth(month: string, delta: number): string {
  const [year, number] = month.split('-').map(Number)
  const index = year * 12 + (number - 1) + delta
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`
}

/** "2026-10" → "October 2026". */
export function formatMonthLabel(month: string): string {
  const [year, number] = month.split('-').map(Number)
  return `${MONTH_NAMES[number - 1]} ${year}`
}

/** Whole-percent change from previous to current, or null when there is nothing to compare with. */
export function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

/** A part's share of the whole as a whole percent (0 when the whole is 0). */
export function sharePercent(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0
}
