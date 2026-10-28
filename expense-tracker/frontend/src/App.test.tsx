// @vitest-environment jsdom
import { StrictMode } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import './test/setup'
import { createExpense, listExpenses, updateExpense } from './api/expenses'
import { generateRecurring } from './api/recurring'
import { getSummary } from './api/summary'
import App from './App'
import { addDays, todayISO } from './lib/dates'
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
const mockGenerate = vi.mocked(generateRecurring)

beforeEach(() => {
  vi.resetAllMocks()
  mockList.mockResolvedValue([])
  vi.mocked(getSummary).mockReturnValue(new Promise(() => {}))
})

it('adds due recurring expenses once, before the first list load', async () => {
  const order: string[] = []
  mockGenerate.mockImplementation(async () => {
    order.push('generate')
    return { added: 2 }
  })
  mockList.mockImplementation(async () => {
    order.push('list')
    return []
  })

  render(<App />)
  await vi.waitFor(() => expect(order).toEqual(['generate', 'list']))

  expect(mockGenerate).toHaveBeenCalledTimes(1)
  expect(mockGenerate).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/))
})

it('still loads the list and shows a toast when the catch-up fails', async () => {
  mockGenerate.mockRejectedValue(new Error('down'))

  render(<App />)

  expect(await screen.findByText(/Couldn’t add recurring expenses/)).toBeInTheDocument()
  expect(mockList).toHaveBeenCalledTimes(1)
})

it('calls the catch-up once under StrictMode and refetches the dashboard when it added expenses', async () => {
  mockGenerate.mockResolvedValue({ added: 1 })

  render(
    <StrictMode>
      <App />
    </StrictMode>,
  )

  await vi.waitFor(() => expect(vi.mocked(getSummary).mock.calls.length).toBeGreaterThanOrEqual(2))
  expect(mockGenerate).toHaveBeenCalledTimes(1)
})

// The save flow: over-budget check around the write.
HTMLDialogElement.prototype.showModal = function () {
  this.setAttribute('open', '')
}
HTMLDialogElement.prototype.close = function () {
  this.removeAttribute('open')
}

const TODAY = todayISO()
const LUNCH: Expense = {
  id: 1,
  amount: 50_000,
  category_id: 'food',
  date: TODAY,
  note: 'Lunch',
  created_at: `${TODAY}T08:00:00`,
}

function foodSummary(food: number, month = TODAY.slice(0, 7)): MonthlySummary {
  return {
    month,
    total: food,
    count: 1,
    same_day_last_month_total: 0,
    categories: [{ category_id: 'food', total: food, count: 1 }],
    budget: {
      month,
      source_month: month,
      is_own: true,
      monthly: 100_000_000,
      categories: { food: 1_000_000 },
    },
  }
}

async function submitForm(edit: boolean, date?: string, answers: () => void = () => {}) {
  render(<App />)
  fireEvent.click((await screen.findAllByRole('button', { name: 'Transactions' }))[0])
  await screen.findByRole('button', { name: 'Edit Lunch' })
  // The Dashboard read its summary on mount; start counting from the save.
  vi.mocked(getSummary).mockReset()
  answers()
  if (edit) fireEvent.click(screen.getByRole('button', { name: 'Edit Lunch' }))
  else fireEvent.click(screen.getAllByRole('button', { name: 'Add expense' })[0])
  const dialog = within(document.querySelector('dialog.dialog-form') as HTMLElement)
  fireEvent.change(dialog.getByLabelText('Amount'), { target: { value: '200000' } })
  fireEvent.click(dialog.getByRole('button', { name: 'Food & Dining' }))
  if (date) fireEvent.change(dialog.getByLabelText('Date'), { target: { value: date } })
  fireEvent.click(dialog.getByRole('button', { name: /^(Add expense|Save changes)$/ }))
}

describe('save with the over-budget check', () => {
  beforeEach(() => {
    mockList.mockResolvedValue([LUNCH])
    mockGenerate.mockResolvedValue({ added: 0 })
    vi.mocked(createExpense).mockResolvedValue({ ...LUNCH, id: 2 })
    vi.mocked(updateExpense).mockResolvedValue(LUNCH)
  })

  it('names a category an add moved over budget', async () => {
    await submitForm(false, undefined, () =>
      vi
        .mocked(getSummary)
        .mockResolvedValueOnce(foodSummary(900_000))
        .mockResolvedValueOnce(foodSummary(1_100_000)),
    )
    expect(await screen.findByText('Expense added. Over budget: Food & Dining.')).toBeTruthy()
  })

  it('looks up the month of the edited date', async () => {
    const past = addDays(TODAY, -40)
    const month = past.slice(0, 7)
    await submitForm(true, past, () =>
      vi
        .mocked(getSummary)
        .mockResolvedValueOnce(foodSummary(900_000, month))
        .mockResolvedValueOnce(foodSummary(1_100_000, month)),
    )
    expect(await screen.findByText('Changes saved. Over budget: Food & Dining.')).toBeTruthy()
    expect(vi.mocked(getSummary).mock.calls.map((call) => call[0])).toEqual([month, month])
  })

  it('skips the after lookup and shows plain text when the before lookup fails', async () => {
    await submitForm(false, undefined, () =>
      vi.mocked(getSummary).mockRejectedValue(new Error('down')),
    )
    expect(await screen.findByText('Expense added')).toBeTruthy()
    expect(vi.mocked(getSummary)).toHaveBeenCalledTimes(1)
  })

  it('shows the form error and no toast when the write fails', async () => {
    vi.mocked(createExpense).mockRejectedValue(new Error('down'))
    await submitForm(false, undefined, () =>
      vi.mocked(getSummary).mockResolvedValue(foodSummary(900_000)),
    )
    await vi.waitFor(() => expect(vi.mocked(createExpense)).toHaveBeenCalled())
    await vi.waitFor(() =>
      expect(document.querySelector('dialog.dialog-form form .alert[role="alert"]')).not.toBeNull(),
    )
    expect(document.querySelector('.toast')).toBeNull()
  })

  it('adds no suffix when the category was already over before the save', async () => {
    await submitForm(false, undefined, () =>
      vi
        .mocked(getSummary)
        .mockResolvedValueOnce(foodSummary(1_100_000))
        .mockResolvedValueOnce(foodSummary(1_300_000)),
    )
    expect(await screen.findByText('Expense added')).toBeTruthy()
  })

  it('shows plain text when the after lookup fails', async () => {
    await submitForm(false, undefined, () =>
      vi
        .mocked(getSummary)
        .mockResolvedValueOnce(foodSummary(900_000))
        .mockRejectedValueOnce(new Error('down')),
    )
    expect(await screen.findByText('Expense added')).toBeTruthy()
    expect(vi.mocked(getSummary)).toHaveBeenCalledTimes(2)
  })

  it('writes once when submit is clicked again during a slow write', async () => {
    let finish: (expense: Expense) => void = () => {}
    vi.mocked(createExpense).mockReturnValue(new Promise((resolve) => (finish = resolve)))
    await submitForm(false, undefined, () =>
      vi.mocked(getSummary).mockResolvedValue(foodSummary(900_000)),
    )
    const button = within(document.querySelector('dialog.dialog-form') as HTMLElement).getByRole(
      'button',
      { name: 'Saving…' },
    )
    expect((button as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(button)
    finish({ ...LUNCH, id: 2 })
    expect(await screen.findByText('Expense added')).toBeTruthy()
    expect(vi.mocked(createExpense)).toHaveBeenCalledTimes(1)
  })

  it('gives up on lookups after 2 s and still saves with a plain toast', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      await submitForm(false, undefined, () =>
        vi.mocked(getSummary).mockReturnValue(new Promise(() => {})),
      )
      // The write does not wait for the lookup: the dialog is closed and no toast shows yet.
      await vi.waitFor(() => expect(document.querySelector('dialog.dialog-form')).toBeNull())
      expect(vi.mocked(createExpense)).toHaveBeenCalledTimes(1)
      expect(screen.queryByText('Expense added')).toBeNull()
      await vi.advanceTimersByTimeAsync(2100)
      expect(await screen.findByText('Expense added')).toBeTruthy()
    } finally {
      vi.useRealTimers()
    }
  })
})
