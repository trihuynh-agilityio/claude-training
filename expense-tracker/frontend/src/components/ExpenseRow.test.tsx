// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import '../test/setup'
import { formatVND } from '../lib/money'
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

const renderRow = (overrides: Partial<Expense>, onDuplicate = vi.fn()) =>
  render(
    <ul>
      <ExpenseRow
        expense={{ ...expense, ...overrides }}
        onEdit={vi.fn()}
        onDuplicate={onDuplicate}
        onDelete={vi.fn()}
      />
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

describe('ExpenseRow duplicate button', () => {
  it('sits between Edit and Delete', () => {
    renderRow({})

    const labels = screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))
    expect(labels).toEqual(['Edit Phở bò', 'Duplicate Phở bò', 'Delete Phở bò'])
  })

  it('is named after the amount when there is no note', () => {
    renderRow({ note: null })

    expect(screen.getByRole('button', { name: `Duplicate expense of ${formatVND(expense.amount)}` })).toBeInTheDocument()
  })

  it('calls onDuplicate with the expense and is not a danger button', () => {
    const onDuplicate = vi.fn()
    renderRow({}, onDuplicate)

    const button = screen.getByRole('button', { name: 'Duplicate Phở bò' })
    fireEvent.click(button)

    expect(onDuplicate).toHaveBeenCalledWith(expense)
    expect(button).not.toHaveClass('danger')
  })
})
