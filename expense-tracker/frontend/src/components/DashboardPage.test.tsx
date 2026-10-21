// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '../test/setup'
import { getSummary } from '../api/summary'
import type { Expense, MonthlySummary } from '../types'
import { DashboardPage } from './DashboardPage'

vi.mock('../api/summary', () => ({ getSummary: vi.fn() }))
const mockGetSummary = vi.mocked(getSummary)

const OCTOBER = '2026-10'

function summary(overrides: Partial<MonthlySummary> = {}): MonthlySummary {
  return {
    month: OCTOBER,
    total: 1_000_000,
    count: 2,
    same_day_last_month_total: 800_000,
    categories: [
      { category_id: 'bills', total: 750_000, count: 1 },
      { category_id: 'food', total: 250_000, count: 1 },
    ],
    ...overrides,
  }
}

const empty = (month: string) =>
  summary({ month, total: 0, count: 0, same_day_last_month_total: 0, categories: [] })

function expense(id: number, date: string, note: string): Expense {
  return { id, amount: 65_000, category_id: 'food', date, note, created_at: `${date}T00:00:00Z` }
}

const EXPENSES = [expense(2, '2026-10-20', 'Phở bò'), expense(1, '2026-09-10', 'September lunch')]

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const handlers = {
  onAdd: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onViewAll: vi.fn(),
  onRetry: vi.fn(),
}

function renderPage(props: Partial<Parameters<typeof DashboardPage>[0]> = {}) {
  const ui = (extra: Partial<Parameters<typeof DashboardPage>[0]> = {}) => (
    <DashboardPage
      expenses={EXPENSES}
      status="ready"
      version={0}
      {...handlers}
      {...props}
      {...extra}
    />
  )
  const view = render(ui())
  return {
    ...view,
    rerenderWith: (extra: Partial<Parameters<typeof DashboardPage>[0]>) => view.rerender(ui(extra)),
  }
}

beforeEach(() => {
  // Only the clock is faked: "today" is fixed while timers and promises stay real.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 21, 12))
  mockGetSummary.mockReset()
  Object.values(handlers).forEach((handler) => handler.mockReset())
})

afterEach(() => vi.useRealTimers())

describe('DashboardPage', () => {
  it('shows the month’s total, comparison, breakdown and recent transactions', async () => {
    mockGetSummary.mockResolvedValue(summary())
    renderPage()

    expect(await screen.findByText('Spent this month')).toBeInTheDocument()
    expect(screen.getByText(/1\.000\.000/)).toBeInTheDocument()
    expect(screen.getByText(/↑ 25% vs same day last month/)).toBeInTheDocument()
    expect(screen.getByText('Spending by category')).toBeInTheDocument()
    expect(screen.getByText('Phở bò')).toBeInTheDocument()
    // Another month's expense is not a recent transaction of October.
    expect(screen.queryByText('September lunch')).not.toBeInTheDocument()
    expect(mockGetSummary).toHaveBeenCalledWith(OCTOBER, '2026-10-21')
  })

  it('disables Next on the current month and loads the month before on Previous', async () => {
    mockGetSummary.mockImplementation((month) => Promise.resolve(summary({ month })))
    renderPage()
    await screen.findByText('Spent this month')
    const user = userEvent.setup()

    expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Previous month' }))

    expect(await screen.findByText('Spent in September 2026')).toBeInTheDocument()
    expect(screen.getByText('September lunch')).toBeInTheDocument()
    expect(screen.getByText(/vs the month before/)).toBeInTheDocument()
    expect(mockGetSummary).toHaveBeenLastCalledWith('2026-09', '2026-10-21')
    expect(screen.getByRole('button', { name: 'Next month' })).toBeEnabled()
  })

  it('offers to add an expense in an empty current month', async () => {
    mockGetSummary.mockResolvedValue(empty(OCTOBER))
    renderPage()

    expect(await screen.findByText('No expenses in October 2026')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Add expense' }))
    expect(handlers.onAdd).toHaveBeenCalled()
  })

  it('does not offer to add an expense in an empty past month', async () => {
    mockGetSummary.mockImplementation((month) =>
      Promise.resolve(month === OCTOBER ? summary() : empty(month)),
    )
    renderPage()
    await screen.findByText('Spent this month')

    await userEvent.setup().click(screen.getByRole('button', { name: 'Previous month' }))

    expect(await screen.findByText('No expenses in September 2026')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add expense' })).not.toBeInTheDocument()
  })

  it('shows an error and recovers when retrying', async () => {
    mockGetSummary.mockRejectedValueOnce(new Error('down')).mockResolvedValue(summary())
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t load your expenses')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Spent this month')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('ignores a slow response for a month the user has already left', async () => {
    const slowOctober = deferred<MonthlySummary>()
    mockGetSummary.mockImplementation((month) =>
      month === OCTOBER ? slowOctober.promise : Promise.resolve(summary({ month, total: 300_000 })),
    )
    renderPage()

    await userEvent.setup().click(screen.getByRole('button', { name: 'Previous month' }))
    expect(await screen.findByText('Spent in September 2026')).toBeInTheDocument()
    slowOctober.resolve(summary({ total: 9_000_000 }))
    await waitFor(() => expect(screen.getByText('Spent in September 2026')).toBeInTheDocument())

    expect(screen.queryByText(/9\.000\.000/)).not.toBeInTheDocument()
    expect(screen.getByText(/300\.000/)).toBeInTheDocument()
  })

  it('keeps showing the last numbers while a change is refetched', async () => {
    mockGetSummary.mockResolvedValueOnce(summary())
    const { rerenderWith, container } = renderPage()
    await screen.findByText('Spent this month')

    const refetch = deferred<MonthlySummary>()
    mockGetSummary.mockReturnValueOnce(refetch.promise)
    rerenderWith({ version: 1 })

    expect(screen.getByText('Spent this month')).toBeInTheDocument()
    expect(screen.getByText(/1\.000\.000/)).toBeInTheDocument()
    expect(container.querySelector('.dashboard')).toHaveAttribute('aria-busy', 'true')

    refetch.resolve(summary({ total: 1_500_000, count: 3 }))
    expect(await screen.findByText(/1\.500\.000/)).toBeInTheDocument()
    expect(container.querySelector('.dashboard')).toHaveAttribute('aria-busy', 'false')
  })

  it('shows the skeleton only after loading takes a moment', async () => {
    const pending = deferred<MonthlySummary>()
    mockGetSummary.mockReturnValue(pending.promise)
    renderPage()

    expect(screen.queryByLabelText('Loading expenses')).not.toBeInTheDocument()
    expect(await screen.findByLabelText('Loading expenses')).toBeInTheDocument()

    pending.resolve(summary())
    expect(await screen.findByText('Spent this month')).toBeInTheDocument()
    expect(screen.queryByLabelText('Loading expenses')).not.toBeInTheDocument()
  })

  it('does not trust the recent list until the expenses have loaded', async () => {
    mockGetSummary.mockResolvedValue(summary())
    const { rerenderWith } = renderPage({ expenses: [], status: 'loading' })

    expect(await screen.findByText('Loading transactions…')).toBeInTheDocument()

    rerenderWith({ status: 'error' })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }))
    expect(handlers.onRetry).toHaveBeenCalled()
  })

  it('goes to Transactions from View all', async () => {
    mockGetSummary.mockResolvedValue(summary())
    renderPage()

    await userEvent.setup().click(await screen.findByRole('button', { name: 'View all' }))

    expect(handlers.onViewAll).toHaveBeenCalled()
  })
})
