import type { BudgetInput, ExpenseInput, RecurringInput } from '../types'
import { CATEGORIES, isCategoryId, type CategoryId } from './categories'
import { todayISO } from './dates'
import { earliestStart } from './recurring'

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

/** The recurring form's raw values: amount and day hold digits only, as typed. */
export type RecurringDraft = {
  amount: string
  category: string
  note: string
  day: string
  startDate: string
  endDate: string
}

export type RecurringField = keyof RecurringDraft
export type RecurringErrors = Partial<Record<RecurringField, string>>

/**
 * Mirrors the backend rules. Amount, category and note use the expense rules; the start date
 * is checked against the 24-month limit only when `checkStart` is true (a locked one is not).
 */
export function validateRecurring(
  draft: RecurringDraft,
  today: string = todayISO(),
  checkStart = true,
): RecurringErrors {
  const { amount, category, note } = validateExpense(
    { amount: draft.amount, category: draft.category, note: draft.note, date: today },
    today,
  )
  const errors: RecurringErrors = {}
  if (amount) errors.amount = amount
  if (category) errors.category = category
  if (note) errors.note = note

  const day = Number(draft.day)
  if (draft.day === '' || day < 1 || day > 31) errors.day = 'Enter a day from 1 to 31.'

  if (draft.startDate === '') errors.startDate = 'Pick a start date.'
  else if (checkStart && draft.startDate < earliestStart(today))
    errors.startDate = 'Start date can’t be more than 24 months ago.'

  if (draft.endDate !== '' && draft.startDate !== '' && draft.endDate < draft.startDate)
    errors.endDate = 'End date can’t be before the start date.'

  return errors
}

/** Call only on a draft that passed validateRecurring. */
export function toRecurringInput(draft: RecurringDraft): RecurringInput {
  return {
    amount: Number(draft.amount),
    category_id: draft.category as RecurringInput['category_id'],
    note: draft.note.trim() || null,
    day: Number(draft.day),
    start_date: draft.startDate,
    end_date: draft.endDate || null,
  }
}
