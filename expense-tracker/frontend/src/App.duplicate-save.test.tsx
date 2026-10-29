// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import './test/setup'
import { createExpense, listExpenses, updateExpense } from './api/expenses'
import { generateRecurring } from './api/recurring'
import { getSummary } from './api/summary'
import App from './App'
import { addDays, todayISO } from './lib/dates'
import { formatVND } from './lib/money'
import type { Expense, MonthlySummary } from './types'

vi.mock('./api/expenses', () => ({
  listExpenses: vi.fn(),
  createExpense: vi.fn(),
  updateExpense: vi.fn(),
  deleteExpense: vi.fn(),
}))
vi.mock('./api/recurring', () => ({ generateRecurring: vi.fn() }))
vi.mock('./api/summary', () => ({ getSummary: vi.fn() }))

HTMLDialogElement.prototype.showModal = function () {
  this.setAttribute('open', '')
}
HTMLDialogElement.prototype.close = function () {
  this.removeAttribute('open')
}

const TODAY = todayISO()
const OLD = addDays(TODAY, -10)

const LUNCH: Expense = {
  id: 1,
  amount: 120_000,
  category_id: 'food',
  date: OLD,
  note: 'Lunch with team',
  created_at: `${OLD}T08:00:00`,
}
const BUS: Expense = {
  id: 2,
  amount: 15_000,
  category_id: 'transport',
  date: OLD,
  note: null,
  created_at: `${OLD}T09:00:00`,
}
const RENT: Expense = {
  id: 3,
  amount: 5_000_000,
  category_id: 'bills',
  date: OLD,
  note: 'Rent',
  created_at: `${OLD}T10:00:00`,
  recurring_id: 3,
}

function summary(): MonthlySummary {
  const month = TODAY.slice(0, 7)
  return {
    month,
    total: 0,
    count: 0,
    same_day_last_month_total: 0,
    categories: [],
    budget: null,
  }
}

function expensesList() {
  return within(screen.getByRole('region', { name: 'Expenses' }))
}

function dialog() {
  return within(document.querySelector('dialog.dialog-form') as HTMLElement)
}

async function openDuplicate(name: RegExp | string) {
  render(<App />)
  fireEvent.click((await screen.findAllByRole('button', { name: 'Transactions' }))[0])
  const button = await screen.findByRole('button', { name })
  fireEvent.click(button)
  return button
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(listExpenses).mockResolvedValue([LUNCH, BUS, RENT])
  vi.mocked(generateRecurring).mockResolvedValue({ added: 0 })
  vi.mocked(getSummary).mockResolvedValue(summary())
  vi.mocked(createExpense).mockImplementation(async (input) => ({
    ...LUNCH,
    ...input,
    id: 99,
    recurring_id: null,
    created_at: `${TODAY}T10:00:00`,
  }))
  vi.mocked(updateExpense).mockResolvedValue(LUNCH)
})

describe('duplicate form', () => {
  it('R5: opens as Add expense with no Delete button', async () => {
    await openDuplicate('Duplicate Lunch with team')
    expect(dialog().getByRole('heading', { name: 'Add expense' })).toBeTruthy()
    expect(dialog().getByRole('button', { name: 'Add expense' })).toBeTruthy()
    expect(dialog().queryByRole('button', { name: 'Delete' })).toBeNull()
  })

  it('R6: copies amount, category and note', async () => {
    await openDuplicate('Duplicate Lunch with team')
    expect((dialog().getByLabelText('Amount') as HTMLInputElement).value).toBe('120.000')
    expect(
      dialog().getByRole('button', { name: 'Food & Dining' }).getAttribute('aria-pressed'),
    ).toBe('true')
    expect((dialog().getByLabelText(/^Note/) as HTMLInputElement).value).toBe('Lunch with team')
  })

  it('R6: an original with no note opens with an empty Note', async () => {
    await openDuplicate(/^Duplicate expense of /)
    expect((dialog().getByLabelText('Amount') as HTMLInputElement).value).toBe('15.000')
    expect((dialog().getByLabelText(/^Note/) as HTMLInputElement).value).toBe('')
  })

  it('R7: the date is today, not the original date', async () => {
    await openDuplicate('Duplicate Lunch with team')
    expect((dialog().getByLabelText('Date') as HTMLInputElement).value).toBe(TODAY)
  })
})

describe('saving a duplicate', () => {
  it('R8: a cleared amount is refused with the usual copy', async () => {
    await openDuplicate('Duplicate Lunch with team')
    fireEvent.change(dialog().getByLabelText('Amount'), { target: { value: '' } })
    fireEvent.click(dialog().getByRole('button', { name: 'Add expense' }))
    expect(await screen.findByText('Enter an amount.')).toBeTruthy()
    expect(screen.getByText('Fix 1 field to save this expense.')).toBeTruthy()
    expect(createExpense).not.toHaveBeenCalled()
  })

  it('R8: a changed amount is what gets saved', async () => {
    await openDuplicate('Duplicate Lunch with team')
    fireEvent.change(dialog().getByLabelText('Amount'), { target: { value: '75.000' } })
    fireEvent.click(dialog().getByRole('button', { name: 'Add expense' }))
    await waitFor(() => expect(createExpense).toHaveBeenCalledTimes(1))
    expect(vi.mocked(createExpense).mock.calls[0][0].amount).toBe(75_000)
  })

  it('R9: creates once with the form values and leaves the original alone', async () => {
    await openDuplicate('Duplicate Lunch with team')
    const lunchCopy: Expense = {
      ...LUNCH,
      id: 99,
      date: TODAY,
      created_at: `${TODAY}T10:00:00`,
      recurring_id: null,
    }
    vi.mocked(listExpenses).mockResolvedValue([LUNCH, BUS, RENT, lunchCopy])
    fireEvent.click(dialog().getByRole('button', { name: 'Add expense' }))
    await waitFor(() => expect(createExpense).toHaveBeenCalledTimes(1))
    expect(createExpense).toHaveBeenCalledWith({
      amount: 120_000,
      category_id: 'food',
      date: TODAY,
      note: 'Lunch with team',
    })
    expect(updateExpense).not.toHaveBeenCalled()
    await screen.findByText('Expense added')
    await waitFor(() =>
      expect(expensesList().getAllByRole('button', { name: 'Edit Lunch with team' })).toHaveLength(
        2,
      ),
    )
    // The original keeps its amount: both the original row and the copy show it.
    const amounts = Array.from(
      document.querySelectorAll('section[aria-label="Expenses"] .expense-amount'),
    ).map((el) => el.textContent)
    expect(amounts.filter((a) => a === formatVND(120_000))).toHaveLength(2)
  })

  it('R10: closes the dialog and shows the toast', async () => {
    await openDuplicate('Duplicate Lunch with team')
    fireEvent.click(dialog().getByRole('button', { name: 'Add expense' }))
    expect(await screen.findByText('Expense added')).toBeTruthy()
    await waitFor(() => expect(document.querySelector('dialog.dialog-form')).toBeNull())
  })

  it('R11: Cancel closes with no save and no toast', async () => {
    await openDuplicate('Duplicate Lunch with team')
    fireEvent.click(dialog().getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(document.querySelector('dialog.dialog-form')).toBeNull())
    expect(createExpense).not.toHaveBeenCalled()
    expect(document.querySelector('.toast')).toBeNull()
  })

  it('R11: Esc closes with no save and no toast', async () => {
    await openDuplicate('Duplicate Lunch with team')
    fireEvent(
      document.querySelector('dialog.dialog-form') as HTMLElement,
      new Event('cancel', { cancelable: true }),
    )
    await waitFor(() => expect(document.querySelector('dialog.dialog-form')).toBeNull())
    expect(createExpense).not.toHaveBeenCalled()
    expect(document.querySelector('.toast')).toBeNull()
  })

  it('R12: a copy of a recurring expense has no recurring_id and no badge', async () => {
    await openDuplicate('Duplicate Rent')
    const rentCopy: Expense = {
      ...RENT,
      id: 99,
      date: TODAY,
      created_at: `${TODAY}T10:00:00`,
      recurring_id: null,
    }
    vi.mocked(listExpenses).mockResolvedValue([LUNCH, BUS, RENT, rentCopy])
    fireEvent.click(dialog().getByRole('button', { name: 'Add expense' }))
    await waitFor(() => expect(createExpense).toHaveBeenCalledTimes(1))
    expect(vi.mocked(createExpense).mock.calls[0][0]).not.toHaveProperty('recurring_id')
    await screen.findByText('Expense added')
    // Only the original Rent row keeps its badge; the new row has none.
    await waitFor(() => expect(expensesList().getAllByText('Rent')).toHaveLength(2))
    expect(
      document.querySelectorAll('section[aria-label="Expenses"] .recurring-badge'),
    ).toHaveLength(1)
  })

  it('a failed save keeps the dialog open with the error and no toast', async () => {
    vi.mocked(createExpense).mockRejectedValue(new Error('down'))
    await openDuplicate('Duplicate Lunch with team')
    fireEvent.click(dialog().getByRole('button', { name: 'Add expense' }))
    expect(
      await screen.findByText('Couldn’t save this expense. Check your connection and try again.'),
    ).toBeTruthy()
    expect(document.querySelector('dialog.dialog-form')).not.toBeNull()
    expect(document.querySelector('.toast')).toBeNull()
  })
})
