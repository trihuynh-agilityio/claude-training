export type BudgetStatus = 'on-track' | 'near-limit' | 'over-budget'

export const STATUS_LABELS: Record<BudgetStatus, string> = {
  'on-track': 'On track',
  'near-limit': 'Near limit',
  'over-budget': 'Over budget',
}

/** Spent ÷ budget: below 85% on track, up to and including 100% near limit, above that over. */
export function budgetStatus(spent: number, budget: number): BudgetStatus {
  // Compared as integers so 84.99% never rounds up to 85%.
  if (spent * 100 < budget * 85) return 'on-track'
  if (spent <= budget) return 'near-limit'
  return 'over-budget'
}

/** Negative once overspent; the amount over is its absolute value. */
export function remaining(budget: number, spent: number): number {
  return budget - spent
}

export function percentUsed(spent: number, budget: number): number {
  return budget > 0 ? Math.round((spent / budget) * 100) : 0
}

/** Days after `today` (YYYY-MM-DD) until the end of its month. */
export function daysLeft(today: string): number {
  const [year, month, day] = today.split('-').map(Number)
  return new Date(year, month, 0).getDate() - day
}

/** Where `today` falls in its month, as a percent, for the progress bar's tick. */
export function todayPercent(today: string): number {
  const [year, month, day] = today.split('-').map(Number)
  return (day / new Date(year, month, 0).getDate()) * 100
}

/** What can be spent each remaining day, rounded down to 1.000 ₫. On the last day, all that is left. */
export function safePerDay(left: number, days: number): number {
  if (left <= 0) return 0
  return Math.floor(left / Math.max(days, 1) / 1000) * 1000
}

const STATUS_ORDER: Record<BudgetStatus, number> = {
  'over-budget': 0,
  'near-limit': 1,
  'on-track': 2,
}

/** Over budget first, then Near limit, then everything else, each by % used (highest first). */
export function sortByStatus<T extends { spent: number; budget: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const byStatus =
      STATUS_ORDER[budgetStatus(a.spent, a.budget)] - STATUS_ORDER[budgetStatus(b.spent, b.budget)]
    return byStatus || b.spent / b.budget - a.spent / a.budget
  })
}
