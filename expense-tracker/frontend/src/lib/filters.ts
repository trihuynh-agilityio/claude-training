import { addDays, todayISO } from './dates'

export type DateRange = 'this-month' | 'last-7-days' | 'last-month' | 'custom'

export const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: 'this-month', label: 'This month' },
  { value: 'last-7-days', label: 'Last 7 days' },
  { value: 'last-month', label: 'Last month' },
  { value: 'custom', label: 'Custom' },
]

export type Filters = {
  query: string
  range: DateRange
  /** Custom range only: ISO dates, '' leaves that side open. */
  from: string
  to: string
}

export const DEFAULT_FILTERS: Filters = { query: '', range: 'this-month', from: '', to: '' }

export type DateBounds = { from: string; to: string }

/** Lowercase and drop Vietnamese diacritics, so "Phở" and "pho" compare equal. */
export function normalizeText(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd')
}

/** Inclusive ISO bounds for a preset range, or null for Custom (which uses its own From/To). */
export function rangeBounds(range: DateRange, today: string = todayISO()): DateBounds | null {
  const firstOfMonth = `${today.slice(0, 7)}-01`
  switch (range) {
    case 'this-month':
      return { from: firstOfMonth, to: today }
    case 'last-7-days':
      return { from: addDays(today, -7), to: today }
    case 'last-month': {
      const lastOfPrevious = addDays(firstOfMonth, -1)
      return { from: `${lastOfPrevious.slice(0, 7)}-01`, to: lastOfPrevious }
    }
    case 'custom':
      return null
  }
}

/** The inline error for a custom range, or undefined when it's valid. */
export function validateRange(from: string, to: string): string | undefined {
  if (from && to && from > to) return 'From date must be on or before To date.'
  return undefined
}

/** Expenses whose note matches the search and whose date falls in the range, in their original order. */
export function filterExpenses<T extends { date: string; note: string | null }>(
  expenses: T[],
  { query, range, from, to }: Filters,
  today: string = todayISO(),
): T[] {
  const bounds = rangeBounds(range, today) ?? { from, to }
  const needle = normalizeText(query.trim())
  return expenses.filter(
    (expense) =>
      (!bounds.from || expense.date >= bounds.from) &&
      (!bounds.to || expense.date <= bounds.to) &&
      (!needle || normalizeText(expense.note ?? '').includes(needle)),
  )
}
