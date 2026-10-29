// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import '../test/setup'
import { todayISO } from '../lib/dates'
import { ExpenseFormDialog } from './ExpenseFormDialog'

beforeAll(() => {
  // jsdom has no modal dialog support.
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open')
  }
})

const renderForm = (prefill?: { amount: number; category_id: 'food'; note: string | null }) =>
  render(
    <ExpenseFormDialog
      prefill={prefill}
      onSave={vi.fn()}
      onClose={vi.fn()}
      onRequestDelete={vi.fn()}
    />,
  )

describe('ExpenseFormDialog prefill', () => {
  it('opens in add mode with the prefilled values and today as the date', () => {
    renderForm({ amount: 65000, category_id: 'food', note: 'Phở bò' })

    expect(screen.getByRole('heading', { name: 'Add expense' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add expense' })).toBeInTheDocument()
    expect(screen.getByLabelText('Amount')).toHaveValue('65.000')
    expect(screen.getByRole('button', { name: /Food/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText(/Note/)).toHaveValue('Phở bò')
    expect(screen.getByLabelText('Date')).toHaveValue(todayISO())
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it('gives an empty Note for a null note', () => {
    renderForm({ amount: 1000, category_id: 'food', note: null })

    expect(screen.getByLabelText(/Note/)).toHaveValue('')
  })

  it('opens empty without a prefill', () => {
    renderForm()

    expect(screen.getByLabelText('Amount')).toHaveValue('')
    expect(screen.getByLabelText(/Note/)).toHaveValue('')
    expect(screen.getByLabelText('Date')).toHaveValue(todayISO())
    expect(screen.getByRole('button', { name: /Food/ })).toHaveAttribute('aria-pressed', 'false')
  })
})
