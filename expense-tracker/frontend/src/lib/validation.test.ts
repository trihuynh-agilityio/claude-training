import { describe, expect, it } from 'vitest'
import { toExpenseInput, validateExpense, type ExpenseDraft } from './validation'

const TODAY = '2026-10-16'
const valid: ExpenseDraft = { amount: '65000', date: TODAY, note: 'Phở bò' }
const check = (overrides: Partial<ExpenseDraft>) => validateExpense({ ...valid, ...overrides }, TODAY)

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
    expect(Object.keys(validateExpense({ amount: '', date: '2026-10-18', note: '' }, TODAY))).toEqual([
      'amount',
      'date',
    ])
  })
})

describe('toExpenseInput', () => {
  it('converts the amount and trims the note', () => {
    expect(toExpenseInput({ amount: '65000', date: TODAY, note: '  Phở bò  ' })).toEqual({
      amount: 65000,
      date: TODAY,
      note: 'Phở bò',
    })
  })

  it('sends a blank note as null', () => {
    expect(toExpenseInput({ amount: '1', date: TODAY, note: '   ' }).note).toBeNull()
  })
})
