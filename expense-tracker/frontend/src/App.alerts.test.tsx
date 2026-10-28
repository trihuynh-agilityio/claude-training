// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import './test/setup'
import { createExpense, deleteExpense, listExpenses, updateExpense } from './api/expenses'
import { generateRecurring } from './api/recurring'
import { getSummary } from './api/summary'
import App from './App'
import { todayISO } from './lib/dates'
import { currentMonth, shiftMonth } from './lib/months'
import type { CategoryId } from './lib/categories'
import type { Expense, MonthlySummary } from './types'

vi.mock('./api/expenses', () => ({
  listExpenses: vi.fn(),
  createExpense: vi.fn(),
  updateExpense: vi.fn(),
  deleteExpense: vi.fn(),
}))
vi.mock('./api/recurring', () => ({ generateRecurring: vi.fn() }))
vi.mock('./api/summary', () => ({ getSummary: vi.fn() }))

const mockList = vi.mocked(listExpenses)
const mockCreate = vi.mocked(createExpense)
const mockUpdate = vi.mocked(updateExpense)
const mockDelete = vi.mocked(deleteExpense)
const mockGenerate = vi.mocked(generateRecurring)
const mockSummary = vi.mocked(getSummary)

const today = todayISO()
const thisMonth = currentMonth()
const lastMonth = shiftMonth(thisMonth, -1)
const lastMonthDate = `${lastMonth}-15`

const EXISTING: Expense = {
  id: 1,
  amount: 50_000,
  category_id: 'food',
  date: today,
  note: 'Lunch',
  created_at: `${today}T00:00:00Z`,
}

type Budgets = { monthly: number; categories?: Partial<Record<CategoryId, number>> }

/** A summary of `month` with the given spending per category and the budget in force. */
function summary(
  month: string,
  spent: Partial<Record<CategoryId, number>>,
  budget: Budgets = { monthly: 10_000_000, categories: { food: 1_000_000 } },
): MonthlySummary {
  const categories = Object.entries(spent).map(([id, total]) => ({
    category_id: id as CategoryId,
    total: total as number,
    count: 1,
  }))
  const total = categories.reduce((sum, item) => sum + item.total, 0)
  return {
    month,
    total,
    count: categories.length,
    same_day_last_month_total: 0,
    categories,
    budget: {
      month,
      source_month: month,
      is_own: true,
      monthly: budget.monthly,
      categories: budget.categories ?? {},
    },
  }
}

/** Queue the before and after lookups of one save, as food totals in `month`. */
function queue(before: number, after: number, month = thisMonth, budget?: Budgets) {
  mockSummary
    .mockResolvedValueOnce(summary(month, { food: before }, budget))
    .mockResolvedValueOnce(summary(month, { food: after }, budget))
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => (resolve = done))
  return { promise, resolve }
}

beforeEach(() => {
  // jsdom may not implement the native <dialog> methods the form uses.
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open')
  }
  vi.resetAllMocks()
  mockGenerate.mockResolvedValue({ added: 0 })
  mockList.mockResolvedValue([EXISTING])
  mockCreate.mockResolvedValue({ ...EXISTING, id: 2 })
  mockUpdate.mockResolvedValue(EXISTING)
  mockDelete.mockResolvedValue(undefined)
  mockSummary.mockReturnValue(new Promise(() => {}))
})

afterEach(() => {
  vi.useRealTimers()
})

/** Open the Transactions screen, so the only summary lookups are the ones the save makes. */
async function openTransactions() {
  render(<App />)
  fireEvent.click(screen.getAllByRole('button', { name: 'Transactions' })[0])
  await screen.findByRole('button', { name: 'Edit Lunch' })
  mockSummary.mockReset()
}

function dialog() {
  return within(document.querySelector('dialog') as HTMLDialogElement)
}

function fillForm({ amount, date }: { amount: string; date?: string }) {
  const form = dialog()
  fireEvent.change(form.getByLabelText('Amount'), { target: { value: amount } })
  if (date) fireEvent.change(form.getByLabelText('Date'), { target: { value: date } })
}

function submitAdd(amount = '100000', date?: string) {
  fireEvent.click(screen.getAllByRole('button', { name: 'Add expense' })[0])
  fillForm({ amount, date })
  fireEvent.click(dialog().getByRole('button', { name: /Food & Dining/ }))
  fireEvent.click(dialog().getByRole('button', { name: 'Add expense' }))
}

function submitEdit(amount = '100000', date?: string) {
  fireEvent.click(screen.getByRole('button', { name: 'Edit Lunch' }))
  fillForm({ amount, date })
  fireEvent.click(dialog().getByRole('button', { name: 'Save changes' }))
}

async function toastText() {
  return (await screen.findByRole('status')).textContent
}

describe('R8: the toast names items that moved into over budget', () => {
  it('names a category after an add', async () => {
    await openTransactions()
    queue(900_000, 1_100_000)
    submitAdd()
    expect(await toastText()).toBe('Expense added. Over budget: Food & Dining.')
  })

  it('names a category after an edit', async () => {
    await openTransactions()
    queue(900_000, 1_100_000)
    submitEdit()
    expect(await toastText()).toBe('Changes saved. Over budget: Food & Dining.')
  })

  it('names the category and the monthly budget when both move over', async () => {
    await openTransactions()
    const budget = { monthly: 1_000_000, categories: { food: 500_000 } as Budgets['categories'] }
    queue(400_000, 1_100_000, thisMonth, budget)
    submitAdd()
    expect(await toastText()).toBe('Expense added. Over budget: Food & Dining, Monthly budget.')
  })
})

describe('R9: the month of the saved date is looked up', () => {
  it('uses the month of a back-dated add, before and after', async () => {
    await openTransactions()
    queue(900_000, 1_100_000, lastMonth)
    submitAdd('100000', lastMonthDate)
    expect(await toastText()).toBe('Expense added. Over budget: Food & Dining.')
    expect(mockSummary).toHaveBeenCalledTimes(2)
    expect(mockSummary.mock.calls.map((call) => call[0])).toEqual([lastMonth, lastMonth])
  })

  it('uses the new date’s month when an edit moves the date', async () => {
    await openTransactions()
    queue(900_000, 1_100_000, lastMonth)
    submitEdit('100000', lastMonthDate)
    expect(await toastText()).toBe('Changes saved. Over budget: Food & Dining.')
    expect(mockSummary.mock.calls.map((call) => call[0])).toEqual([lastMonth, lastMonth])
  })
})

describe('R10: nothing else is added to the toast', () => {
  it('adds nothing for an item that was already over', async () => {
    await openTransactions()
    queue(1_100_000, 1_200_000)
    submitAdd()
    expect(await toastText()).toBe('Expense added')
  })

  it('adds nothing for an item that only moves into near limit', async () => {
    await openTransactions()
    queue(849_999, 850_000)
    submitAdd()
    expect(await toastText()).toBe('Expense added')
  })

  it('names an item that moves from near limit to over budget', async () => {
    await openTransactions()
    queue(1_000_000, 1_000_001)
    submitAdd()
    expect(await toastText()).toBe('Expense added. Over budget: Food & Dining.')
  })
})

describe('R11: deletes and the recurring catch-up never add the message', () => {
  it('shows only "Expense deleted" and looks nothing up', async () => {
    await openTransactions()
    fireEvent.click(screen.getByRole('button', { name: 'Delete Lunch' }))
    fireEvent.click(dialog().getByRole('button', { name: 'Delete expense' }))
    expect(await toastText()).toBe('Expense deleted')
    expect(mockSummary).not.toHaveBeenCalled()
  })

  it('shows no over-budget toast after a catch-up that added expenses', async () => {
    mockGenerate.mockResolvedValue({ added: 2 })
    mockSummary
      .mockResolvedValueOnce(summary(thisMonth, { food: 900_000 }))
      .mockResolvedValue(summary(thisMonth, { food: 1_100_000 }))
    render(<App />)
    await vi.waitFor(() => expect(mockSummary.mock.calls.length).toBeGreaterThanOrEqual(2))
    await screen.findByText('Lunch')
    expect(document.querySelector('.toast')).toBeNull()
  })
})

describe('R12: a failed or slow lookup never blocks the save', () => {
  const never = () => new Promise<MonthlySummary>(() => {})
  const down = () => Promise.reject(new Error('down'))
  const ok = (food: number) => () => Promise.resolve(summary(thisMonth, { food }))
  it.each([
    ['the before lookup rejects', false, down, ok(1_100_000)],
    ['the after lookup rejects', false, ok(900_000), down],
    ['the before lookup never answers', true, never, ok(1_100_000)],
    ['the after lookup never answers', true, ok(900_000), never],
  ])('saves with the plain text when %s', async (_name, slow, before, after) => {
    if (slow) vi.useFakeTimers({ shouldAdvanceTime: true })
    await openTransactions()
    mockSummary.mockImplementationOnce(before).mockImplementationOnce(after)
    submitAdd()
    if (slow) await act(() => vi.advanceTimersByTimeAsync(2000))
    expect(await toastText()).toBe('Expense added')
    expect(mockCreate).toHaveBeenCalledTimes(1)
    expect(mockSummary).toHaveBeenCalledTimes(2)
    expect(document.querySelector('dialog')).toBeNull()
    expect(screen.queryByText(/couldn.?t|error|failed/i)).toBeNull()
  })
})

describe('R13: the toast appears once, with its full text', () => {
  it('shows nothing while the after lookup is pending, then the full text only', async () => {
    await openTransactions()
    const after = deferred<MonthlySummary>()
    mockSummary
      .mockResolvedValueOnce(summary(thisMonth, { food: 900_000 }))
      .mockReturnValueOnce(after.promise)

    const seen: string[] = []
    const observer = new MutationObserver(() => {
      const text = document.querySelector('[role="status"]')?.textContent
      if (text && seen.at(-1) !== text) seen.push(text)
    })
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })

    submitAdd()
    await waitFor(() => expect(mockSummary).toHaveBeenCalledTimes(2))
    expect(screen.queryByRole('status')).toBeNull()

    await act(async () => after.resolve(summary(thisMonth, { food: 1_100_000 })))
    expect(await toastText()).toBe('Expense added. Over budget: Food & Dining.')
    observer.disconnect()
    expect(seen).toEqual(['Expense added. Over budget: Food & Dining.'])
  })
})

describe('R14: the save flow uses only the existing calls', () => {
  it('calls createExpense and getSummary, and nothing else new', async () => {
    await openTransactions()
    queue(900_000, 1_100_000)
    submitAdd()
    await toastText()
    expect(mockCreate).toHaveBeenCalledTimes(1)
    expect(mockSummary).toHaveBeenCalledTimes(2)
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(mockDelete).not.toHaveBeenCalled()
    expect(mockGenerate).toHaveBeenCalledTimes(1)
  })
})
