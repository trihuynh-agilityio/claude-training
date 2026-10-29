// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import './test/setup'
import { listExpenses } from './api/expenses'
import { generateRecurring } from './api/recurring'
import { getSummary } from './api/summary'
import App from './App'
import { todayISO } from './lib/dates'
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
const MONTH = TODAY.slice(0, 7)

function expense(id: number, over: Partial<Expense>): Expense {
  return {
    id,
    amount: 10_000,
    category_id: 'food',
    date: TODAY,
    note: null,
    created_at: `${TODAY}T08:00:00`,
    ...over,
  }
}

const PHO = expense(1, { amount: 120_000, category_id: 'food', note: 'Phở bò' })
const TAXI = expense(2, { amount: 30_000, category_id: 'transport', note: 'Taxi' })
const NO_NOTE = expense(3, { amount: 50_000, category_id: 'shopping', note: null })

function summary(): MonthlySummary {
  return {
    month: MONTH,
    total: 200_000,
    count: 3,
    same_day_last_month_total: 0,
    categories: [],
    budget: null,
  }
}

async function renderApp() {
  render(<App />)
  await screen.findByText('Phở bò')
}

async function openTransactions() {
  fireEvent.click(screen.getAllByRole('button', { name: 'Transactions' })[0])
  await screen.findByRole('region', { name: 'Expenses' })
}

function formDialog() {
  return within(document.querySelector('dialog.dialog-form') as HTMLElement)
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(listExpenses).mockResolvedValue([PHO, TAXI, NO_NOTE])
  vi.mocked(generateRecurring).mockResolvedValue({ added: 0 })
  vi.mocked(getSummary).mockResolvedValue(summary())
})

describe('Duplicate button on rows', () => {
  it('R1: every row in Recent transactions and in Transactions has a Duplicate button', async () => {
    await renderApp()

    const recent = within(await screen.findByRole('region', { name: 'Recent transactions' }))
    const recentRows = recent.getAllByRole('listitem')
    expect(recentRows).toHaveLength(3)
    for (const row of recentRows) {
      expect(within(row).getByRole('button', { name: /^Duplicate / })).toBeTruthy()
    }

    await openTransactions()
    const rows = within(screen.getByRole('region', { name: 'Expenses' })).getAllByRole('listitem')
    expect(rows).toHaveLength(3)
    for (const row of rows) {
      expect(within(row).getByRole('button', { name: /^Duplicate / })).toBeTruthy()
    }
  })

  it('R2: inside one row the buttons are Edit, Duplicate, Delete in that order', async () => {
    await renderApp()
    await openTransactions()

    const row = screen.getByText('Phở bò').closest('li') as HTMLElement
    const names = within(row)
      .getAllByRole('button')
      .map((button) => button.getAttribute('aria-label'))
    expect(names).toEqual(['Edit Phở bò', 'Duplicate Phở bò', 'Delete Phở bò'])
  })

  it('R3: the button is named after the note, or after the amount when there is no note', async () => {
    await renderApp()
    await openTransactions()

    expect(screen.getByRole('button', { name: 'Duplicate Phở bò' })).toBeTruthy()
    expect(
      screen.getByRole('button', { name: `Duplicate expense of ${formatVND(50_000)}` }),
    ).toBeTruthy()
  })
})

describe('Duplicate form', () => {
  it('R13: Cancel puts focus back on that row’s Duplicate button', async () => {
    await renderApp()
    await openTransactions()

    const button = screen.getByRole('button', { name: 'Duplicate Phở bò' })
    button.focus()
    fireEvent.click(button)
    fireEvent.click(formDialog().getByRole('button', { name: 'Cancel' }))

    expect(document.querySelector('dialog.dialog-form')).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Duplicate Phở bò' }))
  })

  it('R14: duplicating row A, cancelling, then duplicating row B shows row B’s values', async () => {
    await renderApp()
    await openTransactions()

    const a = screen.getByRole('button', { name: 'Duplicate Phở bò' })
    a.focus()
    fireEvent.click(a)
    fireEvent.click(formDialog().getByRole('button', { name: 'Cancel' }))

    const b = screen.getByRole('button', { name: 'Duplicate Taxi' })
    b.focus()
    fireEvent.click(b)

    const form = formDialog()
    expect((form.getByLabelText('Amount') as HTMLInputElement).value).toBe('30.000')
    expect(form.getByRole('button', { name: 'Transport' }).getAttribute('aria-pressed')).toBe(
      'true',
    )
    expect(form.getByRole('button', { name: 'Food & Dining' }).getAttribute('aria-pressed')).toBe(
      'false',
    )
    expect((form.getByLabelText(/^Note/) as HTMLInputElement).value).toBe('Taxi')
  })
})
