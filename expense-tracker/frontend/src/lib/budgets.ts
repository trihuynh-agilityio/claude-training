import type { MonthlySummary } from '../types'
import { getCategory } from './categories'

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

/**
 * Whole percent used, never rounded across a status boundary: 84.6% reads 84 (On track) and
 * anything above 100% reads at least 101 (Over budget), so the number never contradicts the badge.
 */
export function percentUsed(spent: number, budget: number): number {
  if (budget <= 0) return 0
  const percent = (spent / budget) * 100
  return spent > budget ? Math.ceil(percent) : Math.floor(percent)
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

/** One budget that can raise an alert: the monthly budget or a category that has its own budget. */
export type AlertItem = { name: string; spent: number; budget: number }

export const MONTHLY_BUDGET_NAME = 'Monthly budget'

/**
 * The over-budget and near-limit items of a summary, each list by % used (highest first).
 * Only the monthly budget and categories with a budget are items; a month without a budget or
 * without expenses has none.
 */
export function budgetAlerts(summary: MonthlySummary): { over: AlertItem[]; near: AlertItem[] } {
  const none = { over: [], near: [] }
  const { budget } = summary
  if (!budget || summary.count === 0) return none
  const items: AlertItem[] = [
    { name: MONTHLY_BUDGET_NAME, spent: summary.total, budget: budget.monthly },
  ]
  for (const [id, limit] of Object.entries(budget.categories)) {
    if (limit === undefined) continue
    const spent = summary.categories.find((row) => row.category_id === id)?.total ?? 0
    items.push({ name: getCategory(id).name, spent, budget: limit })
  }
  const valid = items.filter((item) => item.budget > 0)
  const status = (state: BudgetStatus) =>
    sortByStatus(valid.filter((item) => budgetStatus(item.spent, item.budget) === state))
  return { over: status('over-budget'), near: status('near-limit') }
}

/** Names of the items over budget in `after` that were not over budget in `before`, ordered like the strip. */
export function newlyOver(before: MonthlySummary, after: MonthlySummary): string[] {
  const already = new Set(budgetAlerts(before).over.map((item) => item.name))
  return budgetAlerts(after)
    .over.map((item) => item.name)
    .filter((name) => !already.has(name))
}

/** "Over budget: A, B. Near limit: C." A list with no names is left out; no names at all gives "". */
export function alertText(over: string[], near: string[]): string {
  const parts: string[] = []
  if (over.length > 0) parts.push(`Over budget: ${over.join(', ')}.`)
  if (near.length > 0) parts.push(`Near limit: ${near.join(', ')}.`)
  return parts.join(' ')
}
