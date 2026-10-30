import { describe, expect, it } from 'vitest'
import type { Expense } from '../types'
import { duplicateDraft } from './duplicate'

const expense: Expense = {
  id: 7,
  amount: 65000,
  category_id: 'food',
  date: '2026-10-16',
  note: 'Phở bò',
  created_at: '2026-10-16T00:00:00Z',
}

describe('duplicateDraft', () => {
  it('copies amount, category and note', () => {
    expect(duplicateDraft(expense)).toEqual({ amount: 65000, category_id: 'food', note: 'Phở bò' })
  })

  it('keeps a null note null', () => {
    expect(duplicateDraft({ ...expense, note: null }).note).toBeNull()
  })

  it('returns only amount, category_id and note', () => {
    const draft = duplicateDraft({ ...expense, recurring_id: 3 })
    expect(Object.keys(draft).sort()).toEqual(['amount', 'category_id', 'note'])
  })
})
