import type { Expense, ExpenseInput } from '../types'

/** The form values a duplicate starts from: never the date or the recurring link. */
export type DuplicateDraft = Pick<ExpenseInput, 'amount' | 'category_id' | 'note'>

export function duplicateDraft(expense: Expense): DuplicateDraft {
  return { amount: expense.amount, category_id: expense.category_id, note: expense.note }
}
