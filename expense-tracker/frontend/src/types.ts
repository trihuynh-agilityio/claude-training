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
