// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import './test/setup'
import { getBudget } from './api/budgets'
import { createExpense, deleteExpense, listExpenses, updateExpense } from './api/expenses'
import { generateRecurring } from './api/recurring'
import { getSummary } from './api/summary'
import App from './App'
import { addDays, todayISO } from './lib/dates'
import type { CategoryId } from './lib/categories'
import type { Expense, MonthlySummary } from './types'

// jsdom has no <dialog> modal support.
HTMLDialogElement.prototype.showModal = function () {
  this.setAttribute('open', '')
}
HTMLDialogElement.prototype.close = function () {
  this.removeAttribute('open')
}

vi.mock('./api/expenses', () => ({
  listExpenses: vi.fn(),
  createExpense: vi.fn(),
  updateExpense: vi.fn(),
  deleteExpense: vi.fn(),
}))
vi.mock('./api/recurring', () => ({ generateRecurring: vi.fn() }))
vi.mock('./api/summary', () => ({ getSummary: vi.fn() }))
vi.mock('./api/budgets', () => ({ getBudget: vi.fn(), saveBudget: vi.fn() }))

const mockList = vi.mocked(listExpenses)
const mockCreate = vi.mocked(createExpense)
const mockUpdate = vi.mocked(updateExpense)
const mockDelete = vi.mocked(deleteExpense)
const mockGenerate = vi.mocked(generateRecurring)
const mockSummary = vi.mocked(getSummary)

const TODAY = todayISO()
const MONTH = TODAY.slice(0, 7)
const PAST = addDays(TODAY, -40)
const LUNCH: Expense = {
  id: 1,
  amount: 50_000,
  category_id: 'food',
  date: TODAY,
  note: 'Lunch',
  created_at: `${TODAY}T08:00:00`,
}
const FOOD_LIMIT = { monthly: 100_000_000, food: 1_000_000 }
const NEVER = () => new Promise<MonthlySummary>(() => {})

/** A summary with food spending `food` against a monthly budget and a food budget. */
function summary(food: number, limit = FOOD_LIMIT, month = MONTH): MonthlySummary {
  const budget = { month, source_month: month, is_own: true, monthly: limit.monthly }
  return {
    month,
    total: food,
    count: 1,
    same_day_last_month_total: 0,
    categories: [{ category_id: 'food' as CategoryId, total: food, count: 1 }],
    budget: { ...budget, categories: { food: limit.food } },
  }
}

/** Opens the Transactions screen, so only the save flow reads summaries. */
async function openTransactions() {
  render(<App />)
  fireEvent.click((await screen.findAllByRole('button', { name: 'Transactions' }))[0])
  await screen.findByRole('button', { name: 'Edit Lunch' })
  mockSummary.mockReset()
  mockSummary.mockImplementation(NEVER)
}

const formDialog = () => document.querySelector('dialog.dialog-form') as HTMLDialogElement
const toastText = () => document.querySelector('.toast')?.textContent ?? null

/** Adds (or edits Lunch, when `edit`) with the given fields and submits the form. */
function submit(fields: { amount?: string; date?: string } = {}, edit = false) {
  if (edit) fireEvent.click(screen.getByRole('button', { name: 'Edit Lunch' }))
  else fireEvent.click(screen.getAllByRole('button', { name: 'Add expense' })[0])
  const dialog = within(formDialog())
  const amount = fields.amount ?? '200000'
  fireEvent.change(dialog.getByLabelText('Amount'), { target: { value: amount } })
  fireEvent.click(dialog.getByRole('button', { name: 'Food & Dining' }))
  if (fields.date)
    fireEvent.change(dialog.getByLabelText('Date'), { target: { value: fields.date } })
  fireEvent.click(dialog.getByRole('button', { name: /^(Add expense|Save changes)$/ }))
}

/** Answers the before and after lookups in turn. */
function answer(before: MonthlySummary, after: MonthlySummary) {
  mockSummary.mockResolvedValueOnce(before).mockResolvedValueOnce(after)
}

beforeEach(() => {
  vi.resetAllMocks()
  mockList.mockResolvedValue([LUNCH])
  mockGenerate.mockResolvedValue({ added: 0 })
  mockCreate.mockResolvedValue({ ...LUNCH, id: 2 })
  mockUpdate.mockResolvedValue(LUNCH)
  mockDelete.mockResolvedValue(undefined)
  mockSummary.mockImplementation(NEVER)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('R8 and R9: naming what moved over budget', () => {
  it.each([
    ['an add', false, 'Expense added. Over budget: Food & Dining.'],
    ['an edit', true, 'Changes saved. Over budget: Food & Dining.'],
  ])('names the category %s moved over budget', async (_name, edit, text) => {
    await openTransactions()
    answer(summary(900_000), summary(1_100_000))
    submit({}, edit)
    expect(await screen.findByText(text)).toBeInTheDocument()
  })

  it('names both the category and the monthly budget when both moved over', async () => {
    const limit = { monthly: 2_000_000, food: 1_000_000 }
    await openTransactions()
    answer(summary(900_000, limit), summary(2_100_000, limit))
    submit()
    const text = 'Expense added. Over budget: Food & Dining, Monthly budget.'
    expect(await screen.findByText(text)).toBeInTheDocument()
  })

  it.each([
    ['a back-dated add', false],
    ['an edit that moves the date', true],
  ])('looks up the saved date’s month for %s', async (_name, edit) => {
    const month = PAST.slice(0, 7)
    await openTransactions()
    answer(summary(900_000, FOOD_LIMIT, month), summary(1_100_000, FOOD_LIMIT, month))
    submit({ date: PAST }, edit)
    expect(await screen.findByText(/Over budget: Food & Dining\.$/)).toBeInTheDocument()
    expect(mockSummary.mock.calls.map((call) => call[0])).toEqual([month, month])
  })
})

describe('R10: what adds nothing to the toast', () => {
  it.each([
    ['was already over budget', 1_100_000, 1_300_000],
    ['only reaches its near limit', 849_999, 850_000],
  ])('gives the plain text when the item %s', async (_name, before, after) => {
    await openTransactions()
    answer(summary(before), summary(after))
    submit()
    expect(await screen.findByText('Expense added')).toBeInTheDocument()
    expect(toastText()).toBe('Expense added')
  })

  it('names an item that goes from near limit (1.000.000) to over (1.000.001)', async () => {
    await openTransactions()
    answer(summary(1_000_000), summary(1_000_001))
    submit({ amount: '1' })
    expect(
      await screen.findByText('Expense added. Over budget: Food & Dining.'),
    ).toBeInTheDocument()
  })
})

describe('R11: no over-budget message for delete or catch-up', () => {
  it('shows only "Expense deleted" and reads no summary', async () => {
    await openTransactions()
    mockSummary.mockResolvedValue(summary(1_100_000))
    fireEvent.click(screen.getByRole('button', { name: 'Delete Lunch' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Delete expense' }))
    expect(await screen.findByText('Expense deleted')).toBeInTheDocument()
    expect(toastText()).toBe('Expense deleted')
    expect(mockSummary).not.toHaveBeenCalled()
  })

  it('shows no over-budget toast after a catch-up that added expenses', async () => {
    mockGenerate.mockResolvedValue({ added: 2 })
    mockSummary.mockResolvedValue(summary(1_100_000))
    render(<App />)
    await vi.waitFor(() => expect(mockList).toHaveBeenCalledTimes(1))
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
    })
    expect(toastText() ?? '').not.toMatch(/Over budget/)
  })
})

describe('R12: a slow or failed lookup never blocks the save', () => {
  async function expectPlainSave(lookups: number) {
    expect(await screen.findByText('Expense added')).toBeInTheDocument()
    expect(mockCreate).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(formDialog()).toBeNull())
    expect(toastText()).toBe('Expense added')
    expect(screen.queryByText(/Couldn’t/)).toBeNull()
    expect(mockSummary).toHaveBeenCalledTimes(lookups)
  }
  const wait = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)))

  it('saves plainly when the before lookup rejects (1 lookup)', async () => {
    await openTransactions()
    mockSummary.mockRejectedValue(new Error('down'))
    submit()
    await expectPlainSave(1)
  })

  it('saves plainly when the after lookup rejects (2 lookups)', async () => {
    await openTransactions()
    mockSummary.mockResolvedValueOnce(summary(900_000)).mockRejectedValueOnce(new Error('down'))
    submit()
    await expectPlainSave(2)
  })

  it('gives up on an after lookup that never answers after 2 seconds', async () => {
    await openTransactions()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    mockSummary.mockResolvedValueOnce(summary(900_000)).mockImplementationOnce(NEVER)
    submit()
    await wait(2_000)
    await expectPlainSave(2)
  })

  it('gives up on a before lookup that never answers after 2 seconds', async () => {
    await openTransactions()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    submit()
    await wait(2_000)
    await expectPlainSave(1)
  })
})

describe('R13: one toast, shown after the check', () => {
  it('shows nothing while the after lookup is pending, then the full text once', async () => {
    await openTransactions()
    let finish: (value: MonthlySummary) => void = () => {}
    mockSummary
      .mockResolvedValueOnce(summary(900_000))
      .mockReturnValueOnce(new Promise<MonthlySummary>((resolve) => (finish = resolve)))
    const seen: string[] = []
    const observer = new MutationObserver(() => {
      const text = toastText()
      if (text !== null && seen.at(-1) !== text) seen.push(text)
    })
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })

    submit()
    await vi.waitFor(() => expect(mockSummary).toHaveBeenCalledTimes(2))
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
    })
    expect(toastText()).toBeNull()

    await act(async () => finish(summary(1_100_000)))
    const text = 'Expense added. Over budget: Food & Dining.'
    expect(await screen.findByText(text)).toBeInTheDocument()
    observer.disconnect()
    expect(seen).toEqual([text])
  })
})

describe('R14: the save uses no other API', () => {
  it.each([
    ['an add', false, mockCreate, mockUpdate],
    ['an edit', true, mockUpdate, mockCreate],
  ])('calls only the write and getSummary for %s', async (_name, edit, used, unused) => {
    await openTransactions()
    mockSummary.mockResolvedValue(summary(900_000))
    submit({}, edit)
    await screen.findByText(/^(Expense added|Changes saved)/)
    // The existing list reload after a save is expected and not counted here.
    expect(used).toHaveBeenCalledTimes(1)
    expect(unused).not.toHaveBeenCalled()
    expect(mockDelete).not.toHaveBeenCalled()
    expect(vi.mocked(getBudget)).not.toHaveBeenCalled()
    expect(mockGenerate).toHaveBeenCalledTimes(1)
    expect(mockSummary).toHaveBeenCalledTimes(2)
  })
})
