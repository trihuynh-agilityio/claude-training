import { describe, expect, it } from 'vitest'
import {
  toBudgetInput,
  toExpenseInput,
  toRecurringInput,
  validateBudget,
  validateExpense,
  validateRecurring,
  type BudgetDraft,
  type ExpenseDraft,
  type RecurringDraft,
} from './validation'

const TODAY = '2026-10-16'
const valid: ExpenseDraft = { amount: '65000', category: 'food', date: TODAY, note: 'Phở bò' }
const check = (overrides: Partial<ExpenseDraft>) =>
  validateExpense({ ...valid, ...overrides }, TODAY)

describe('validateExpense', () => {
  it('accepts a complete expense', () => {
    expect(check({})).toEqual({})
  })

  it('accepts an empty note and the amount boundaries', () => {
    expect(check({ note: '' })).toEqual({})
    expect(check({ amount: '1' })).toEqual({})
    expect(check({ amount: '1000000000' })).toEqual({})
  })

  it('requires an amount', () => {
    expect(check({ amount: '' }).amount).toBe('Enter an amount.')
  })

  it('rejects a zero amount', () => {
    expect(check({ amount: '0' }).amount).toBe('Amount must be greater than 0 ₫.')
  })

  it('rejects an amount above 1.000.000.000 ₫', () => {
    expect(check({ amount: '1000000001' }).amount).toBe(
      'That’s more than 1.000.000.000 ₫ — please check the amount.',
    )
  })

  it('requires one of the known categories', () => {
    expect(check({ category: '' }).category).toBe('Choose a category.')
    expect(check({ category: 'coffee' }).category).toBe('Choose a category.')
    expect(check({ category: 'other' }).category).toBeUndefined()
  })

  it('requires a date that is not in the future', () => {
    expect(check({ date: '' }).date).toBe('Pick a date.')
    expect(check({ date: '2026-10-17' }).date).toBe('Date can’t be in the future.')
    expect(check({ date: '2026-10-15' }).date).toBeUndefined()
  })

  it('limits the note to 120 characters after trimming', () => {
    expect(check({ note: 'x'.repeat(121) }).note).toBe('Keep the note to 120 characters or fewer.')
    expect(check({ note: `  ${'x'.repeat(120)}  ` }).note).toBeUndefined()
  })

  it('reports every invalid field at once', () => {
    expect(
      Object.keys(
        validateExpense({ amount: '', category: '', date: '2026-10-18', note: '' }, TODAY),
      ),
    ).toEqual(['amount', 'category', 'date'])
  })
})

describe('toExpenseInput', () => {
  it('converts the amount, maps the category and trims the note', () => {
    expect(
      toExpenseInput({ amount: '65000', category: 'food', date: TODAY, note: '  Phở bò  ' }),
    ).toEqual({
      amount: 65000,
      category_id: 'food',
      date: TODAY,
      note: 'Phở bò',
    })
  })

  it('sends a blank note as null', () => {
    expect(
      toExpenseInput({ amount: '1', category: 'other', date: TODAY, note: '   ' }).note,
    ).toBeNull()
  })
})

describe('validateBudget', () => {
  const draft = (monthly: string, categories: BudgetDraft['categories'] = {}): BudgetDraft => ({
    monthly,
    categories,
  })

  it('accepts a monthly budget alone, and categories that fit', () => {
    expect(validateBudget(draft('15000000'))).toEqual({})
    expect(validateBudget(draft('1000', { food: '600', bills: '400' }))).toEqual({})
  })

  it('treats an empty category as no budget', () => {
    expect(validateBudget(draft('1000', { food: '' }))).toEqual({})
  })

  it('requires a monthly budget above 0 and within the limit', () => {
    expect(validateBudget(draft('')).monthly).toBe('Enter a monthly budget.')
    expect(validateBudget(draft('0')).monthly).toBe('Monthly budget must be greater than 0 ₫.')
    expect(validateBudget(draft('1000000001')).monthly).toContain('1.000.000.000')
    expect(validateBudget(draft('1000000000'))).toEqual({})
  })

  it('rejects a category budget of 0 or over the limit', () => {
    expect(validateBudget(draft('1000', { food: '0' })).categories?.food).toBe(
      'Category budget must be greater than 0 ₫.',
    )
    expect(validateBudget(draft('1000', { food: '1000000001' })).categories?.food).toContain(
      '1.000.000.000',
    )
  })

  it('rejects categories adding up to more than the monthly budget', () => {
    expect(validateBudget(draft('1000', { food: '600', bills: '401' })).total).toBe(
      'Category budgets add up to more than the monthly budget.',
    )
  })

  it('skips the total check while the monthly budget is invalid', () => {
    expect(validateBudget(draft('', { food: '600' })).total).toBeUndefined()
  })
})

describe('toBudgetInput', () => {
  it('drops empty categories and converts to numbers', () => {
    expect(
      toBudgetInput({ monthly: '15000000', categories: { food: '4500000', bills: '' } }),
    ).toEqual({
      monthly: 15_000_000,
      categories: { food: 4_500_000 },
    })
  })
})

describe('validateRecurring', () => {
  const rule: RecurringDraft = {
    amount: '5000000',
    category: 'bills',
    note: 'Rent',
    day: '1',
    startDate: '2026-08-01',
    endDate: '',
  }
  const checkRule = (overrides: Partial<RecurringDraft>) =>
    validateRecurring({ ...rule, ...overrides }, TODAY)

  it('accepts a valid rule', () => {
    expect(checkRule({})).toEqual({})
  })

  it('uses the expense messages for amount, category and note', () => {
    expect(checkRule({ amount: '' }).amount).toBe('Enter an amount.')
    expect(checkRule({ amount: '0' }).amount).toBe('Amount must be greater than 0 ₫.')
    expect(checkRule({ category: '' }).category).toBe('Choose a category.')
    expect(checkRule({ note: 'x'.repeat(121) }).note).toContain('120')
  })

  it('wants a day from 1 to 31', () => {
    for (const day of ['', '0', '32'])
      expect(checkRule({ day }).day).toBe('Enter a day from 1 to 31.')
    expect(checkRule({ day: '31' }).day).toBeUndefined()
  })

  it('wants a start date no more than 24 months back', () => {
    expect(checkRule({ startDate: '' }).startDate).toBe('Pick a start date.')
    expect(checkRule({ startDate: '2024-09-30' }).startDate).toBe(
      'Start date can’t be more than 24 months ago.',
    )
    expect(checkRule({ startDate: '2024-10-16' }).startDate).toBeUndefined()
    expect(
      validateRecurring({ ...rule, startDate: '2020-01-01' }, TODAY, false).startDate,
    ).toBeUndefined()
  })

  it('rejects an end date before the start date', () => {
    expect(checkRule({ endDate: '2026-07-31' }).endDate).toBe(
      'End date can’t be before the start date.',
    )
    expect(checkRule({ endDate: '2026-08-01' }).endDate).toBeUndefined()
  })

  it('converts a draft to the API input', () => {
    expect(toRecurringInput({ ...rule, note: ' Rent ' })).toEqual({
      amount: 5_000_000,
      category_id: 'bills',
      note: 'Rent',
      day: 1,
      start_date: '2026-08-01',
      end_date: null,
    })
  })
})
