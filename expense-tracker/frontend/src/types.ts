import type { CategoryId } from './lib/categories'

/** An expense as returned by the API. */
export type Expense = {
  id: number
  /** Whole đồng. */
  amount: number
  category_id: CategoryId
  /** ISO date, YYYY-MM-DD. */
  date: string
  note: string | null
  created_at: string
}

/** The fields sent to create or replace an expense. */
export type ExpenseInput = Pick<Expense, 'amount' | 'category_id' | 'date' | 'note'>

export type CategoryTotal = { category_id: CategoryId; total: number; count: number }

/** `GET /api/summary` for one month ("YYYY-MM"). Categories are sorted by total, largest first. */
export type MonthlySummary = {
  month: string
  total: number
  count: number
  /** Spent in the month before, up to the same day of the month. */
  same_day_last_month_total: number
  categories: CategoryTotal[]
}
