import type { BudgetInput, ExpenseInput } from '../types'
import { CATEGORIES, isCategoryId, type CategoryId } from './categories'
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

/** The budget form's raw values: digits only, as typed. An empty category has no budget. */
export type BudgetDraft = { monthly: string; categories: Partial<Record<CategoryId, string>> }

export type BudgetErrors = {
  monthly?: string
  categories?: Partial<Record<CategoryId, string>>
  /** The category budgets together exceed the monthly budget. */
  total?: string
}

const OVER_LIMIT = 'That’s more than 1.000.000.000 ₫ — please check the amount.'

/** Mirrors the backend rules; the API stays the authority. */
export function validateBudget(draft: BudgetDraft): BudgetErrors {
  const errors: BudgetErrors = {}
  const monthly = Number(draft.monthly)

  if (draft.monthly === '') errors.monthly = 'Enter a monthly budget.'
  else if (monthly === 0) errors.monthly = 'Monthly budget must be greater than 0 ₫.'
  else if (monthly > MAX_AMOUNT) errors.monthly = OVER_LIMIT

  let allocated = 0
  for (const { id } of CATEGORIES) {
    const text = draft.categories[id] ?? ''
    if (text === '') continue
    const amount = Number(text)
    allocated += amount
    if (amount === 0) (errors.categories ??= {})[id] = 'Category budget must be greater than 0 ₫.'
    else if (amount > MAX_AMOUNT) (errors.categories ??= {})[id] = OVER_LIMIT
  }

  if (!errors.monthly && allocated > monthly)
    errors.total = 'Category budgets add up to more than the monthly budget.'

  return errors
}

/** Call only on a draft that passed validateBudget. */
export function toBudgetInput(draft: BudgetDraft): BudgetInput {
  const categories: BudgetInput['categories'] = {}
  for (const { id } of CATEGORIES) {
    const text = draft.categories[id] ?? ''
    if (text !== '') categories[id] = Number(text)
  }
  return { monthly: Number(draft.monthly), categories }
}
