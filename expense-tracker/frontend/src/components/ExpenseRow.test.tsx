// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import '../test/setup'
import type { Expense } from '../types'
import { ExpenseRow } from './ExpenseRow'

const expense: Expense = {
  id: 1,
  amount: 65000,
  category_id: 'food',
  date: '2026-10-16',
  note: 'Phở bò',
  created_at: '2026-10-16T00:00:00Z',
}

const renderRow = (overrides: Partial<Expense>) =>
  render(
    <ul>
      <ExpenseRow expense={{ ...expense, ...overrides }} onEdit={vi.fn()} onDelete={vi.fn()} />
    </ul>,
  )

describe('ExpenseRow recurring badge', () => {
  it('is shown only when the expense came from a rule', () => {
    renderRow({ recurring_id: 3 })

    expect(screen.getByText('Recurring')).toBeInTheDocument()
  })

  it('is hidden for ordinary expenses', () => {
    renderRow({ recurring_id: null })

    expect(screen.queryByText('Recurring')).not.toBeInTheDocument()
  })
})
