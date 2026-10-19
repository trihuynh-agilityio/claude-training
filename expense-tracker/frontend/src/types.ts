/** An expense as returned by the API. */
export type Expense = {
  id: number
  /** Whole đồng. */
  amount: number
  /** ISO date, YYYY-MM-DD. */
  date: string
  note: string | null
  created_at: string
}

/** The fields sent to create or replace an expense. */
export type ExpenseInput = Pick<Expense, 'amount' | 'date' | 'note'>
