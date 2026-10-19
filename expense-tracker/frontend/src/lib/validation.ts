import type { ExpenseInput } from '../types'
import { isCategoryId } from './categories'
import { todayISO } from './dates'

export const MAX_AMOUNT = 1_000_000_000
export const MAX_NOTE_LENGTH = 120

/** The form's raw values: amount holds digits only, as typed; category is '' until picked. */
export type ExpenseDraft = { amount: string; category: string; date: string; note: string }

export type ExpenseField = keyof ExpenseDraft
export type FieldErrors = Partial<Record<ExpenseField, string>>

/** Mirrors the backend rules; messages come from design/DESIGN.md section 6. */
export function validateExpense(draft: ExpenseDraft, today: string = todayISO()): FieldErrors {
  const errors: FieldErrors = {}
  const amount = Number(draft.amount)

  if (draft.amount === '') errors.amount = 'Enter an amount.'
  else if (amount === 0) errors.amount = 'Amount must be greater than 0 ₫.'
  else if (amount > MAX_AMOUNT)
    errors.amount = 'That’s more than 1.000.000.000 ₫ — please check the amount.'

  if (!isCategoryId(draft.category)) errors.category = 'Choose a category.'

  if (draft.date === '') errors.date = 'Pick a date.'
  else if (draft.date > today) errors.date = 'Date can’t be in the future.'

  if (draft.note.trim().length > MAX_NOTE_LENGTH)
    errors.note = `Keep the note to ${MAX_NOTE_LENGTH} characters or fewer.`

  return errors
}

/** Call only on a draft that passed validateExpense. */
export function toExpenseInput(draft: ExpenseDraft): ExpenseInput {
  return {
    amount: Number(draft.amount),
    category_id: draft.category as ExpenseInput['category_id'],
    date: draft.date,
    note: draft.note.trim() || null,
  }
}
