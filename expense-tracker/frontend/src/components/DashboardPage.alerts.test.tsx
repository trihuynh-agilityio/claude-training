// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '../test/setup'
import { getSummary } from '../api/summary'
import type { CategoryId } from '../lib/categories'
import type { Budget, MonthlySummary } from '../types'
import { DashboardPage } from './DashboardPage'

vi.mock('../api/summary', () => ({ getSummary: vi.fn() }))
const mockGetSummary = vi.mocked(getSummary)

const OCTOBER = '2026-10'
const BIG = 100_000_000
const MILLION = 1_000_000

function budget(
  monthly: number,
  categories: Partial<Record<CategoryId, number>> = {},
  month = OCTOBER,
): Budget {
  return { month, source_month: month, is_own: true, monthly, categories }
}

/** The total is the sum of the category totals unless given. */
function summary(
  spent: Partial<Record<CategoryId, number>>,
  b: Budget | null,
  options: { month?: string; total?: number } = {},
): MonthlySummary {
  const categories = Object.entries(spent).map(([category_id, total]) => ({
    category_id: category_id as CategoryId,
    total: total as number,
    count: 1,
  }))
  const total = options.total ?? categories.reduce((sum, item) => sum + item.total, 0)
  return {
    month: options.month ?? OCTOBER,
    total,
    count: categories.length,
    same_day_last_month_total: 0,
    categories,
    budget: b,
  }
}

const handlers = {
  onAdd: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onViewAll: vi.fn(),
  onOpenBudget: vi.fn(),
  onRetry: vi.fn(),
}

function renderPage() {
  const ui = (version: number) => (
    <DashboardPage expenses={[]} status="ready" version={version} {...handlers} />
  )
  const view = render(ui(0))
  return { ...view, bumpVersion: () => view.rerender(ui(1)) }
}

/** Shows the page with this summary and waits for the Dashboard to render it. */
async function showSummary(value: MonthlySummary) {
  mockGetSummary.mockResolvedValue(value)
  const view = renderPage()
  if (value.count > 0) await screen.findByText('Spending by category')
  else await screen.findByText(/No expenses in/)
  return view
}

const stripText = () => screen.queryByText(/(Over budget|Near limit): /)

/** A monthly budget of 1.000.000 with this much spent in total. */
const monthlyOnly = (spent: number) => summary({ other: spent }, budget(MILLION))
/** A Food & Dining budget of 1.000.000 with this much spent on it, and a huge monthly budget. */
const foodOnly = (spent: number) => summary({ food: spent }, budget(BIG, { food: MILLION }))

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 21, 12))
  mockGetSummary.mockReset()
  Object.values(handlers).forEach((handler) => handler.mockReset())
})

afterEach(() => vi.useRealTimers())

describe('Dashboard budget alert strip', () => {
  describe('R1 when it shows', () => {
    it('is absent when every item is under 85%', async () => {
      await showSummary(summary({ food: 500_000, bills: 100_000 }, budget(BIG, { food: MILLION })))
      expect(stripText()).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'View budget' })).not.toBeInTheDocument()
    })

    it('is present when one item is near or over', async () => {
      await showSummary(foodOnly(900_000))
      expect(await screen.findByText(/Near limit: Food & Dining/)).toBeInTheDocument()
    })
  })

  describe('R2 which items count', () => {
    it('never names a category that has spending but no budget', async () => {
      await showSummary(
        summary({ food: 9_000_000, bills: 900_000 }, budget(BIG, { bills: MILLION })),
      )
      expect(await screen.findByText('Near limit: Bills & Utilities.')).toBeInTheDocument()
    })

    it('does not name a budgeted category with no expenses', async () => {
      await showSummary(summary({ food: 900_000 }, budget(BIG, { food: MILLION, bills: MILLION })))
      const text = await screen.findByText(/Near limit: /)
      expect(text).toHaveTextContent('Near limit: Food & Dining.')
      expect(text).not.toHaveTextContent('Bills')
    })

    it('gives no strip without a budget, and keeps the invite', async () => {
      await showSummary(summary({ food: 900_000 }, null))
      expect(stripText()).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Set a monthly budget' })).toBeInTheDocument()
    })

    it('gives no strip for a month with no expenses', async () => {
      await showSummary(summary({}, budget(MILLION, { food: MILLION })))
      expect(stripText()).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'View budget' })).not.toBeInTheDocument()
    })
  })

  describe('R3 boundaries on a 1.000.000 budget', () => {
    it('does not name a category at 849.999', async () => {
      await showSummary(foodOnly(849_999))
      expect(stripText()).not.toBeInTheDocument()
    })

    it('calls a category near limit at 850.000', async () => {
      await showSummary(foodOnly(850_000))
      expect(await screen.findByText('Near limit: Food & Dining.')).toBeInTheDocument()
    })

    it('calls a category near limit at 1.000.000', async () => {
      await showSummary(foodOnly(MILLION))
      expect(await screen.findByText('Near limit: Food & Dining.')).toBeInTheDocument()
    })

    it('calls a category over budget at 1.000.001', async () => {
      await showSummary(foodOnly(1_000_001))
      expect(await screen.findByText('Over budget: Food & Dining.')).toBeInTheDocument()
    })

    it('does not name the monthly budget at 849.999', async () => {
      await showSummary(monthlyOnly(849_999))
      expect(stripText()).not.toBeInTheDocument()
    })

    it('calls the monthly budget near limit at 850.000', async () => {
      await showSummary(monthlyOnly(850_000))
      expect(await screen.findByText('Near limit: Monthly budget.')).toBeInTheDocument()
    })

    it('calls the monthly budget near limit at 1.000.000', async () => {
      await showSummary(monthlyOnly(MILLION))
      expect(await screen.findByText('Near limit: Monthly budget.')).toBeInTheDocument()
    })

    it('calls the monthly budget over budget at 1.000.001', async () => {
      await showSummary(monthlyOnly(1_000_001))
      expect(await screen.findByText('Over budget: Monthly budget.')).toBeInTheDocument()
    })
  })

  describe('R4 text', () => {
    it('lists over-budget items, then near-limit items', async () => {
      await showSummary(
        summary(
          { food: 1_500_000, bills: 900_000 },
          budget(2_000_000, { food: MILLION, bills: MILLION }),
        ),
      )
      expect(
        await screen.findByText(
          'Over budget: Food & Dining, Monthly budget. Near limit: Bills & Utilities.',
        ),
      ).toBeInTheDocument()
    })

    it('leaves out the over-budget part when nothing is over', async () => {
      await showSummary(foodOnly(900_000))
      const text = await screen.findByText(/Near limit: /)
      expect(text).not.toHaveTextContent('Over budget')
    })

    it('leaves out the near-limit part when nothing is near', async () => {
      await showSummary(foodOnly(1_200_000))
      const text = await screen.findByText(/Over budget: Food/)
      expect(text).not.toHaveTextContent('Near limit')
    })
  })

  describe('R5 order', () => {
    it('lists each group by percent used, highest first', async () => {
      await showSummary(
        summary(
          { shopping: 900_000, bills: 950_000, transport: 1_200_000, food: 2_000_000 },
          budget(BIG, {
            shopping: MILLION,
            bills: MILLION,
            transport: MILLION,
            food: MILLION,
          }),
        ),
      )
      expect(
        await screen.findByText(
          'Over budget: Food & Dining, Transport. Near limit: Bills & Utilities, Shopping.',
        ),
      ).toBeInTheDocument()
    })
  })

  describe('R6 View budget', () => {
    it('opens the Budget screen once when clicked', async () => {
      await showSummary(foodOnly(1_200_000))
      await userEvent.setup().click(await screen.findByRole('button', { name: 'View budget' }))
      expect(handlers.onOpenBudget).toHaveBeenCalledTimes(1)
    })
  })

  describe('R7 follows the data', () => {
    it('has no close button', async () => {
      await showSummary(foodOnly(1_200_000))
      await screen.findByText(/Over budget: /)
      expect(screen.queryByRole('button', { name: /close|dismiss/i })).not.toBeInTheDocument()
    })

    it('disappears when a refetch has nothing near or over', async () => {
      mockGetSummary.mockResolvedValueOnce(foodOnly(1_200_000))
      const { bumpVersion } = renderPage()
      expect(await screen.findByText('Over budget: Food & Dining.')).toBeInTheDocument()

      mockGetSummary.mockResolvedValueOnce(foodOnly(100_000))
      bumpVersion()

      await waitFor(() => expect(stripText()).not.toBeInTheDocument())
    })

    it('changes with the month shown in the switcher', async () => {
      mockGetSummary.mockImplementation((month) =>
        Promise.resolve(
          month === OCTOBER
            ? foodOnly(1_200_000)
            : summary({ bills: 900_000 }, budget(BIG, { bills: MILLION }, month), { month }),
        ),
      )
      renderPage()
      expect(await screen.findByText('Over budget: Food & Dining.')).toBeInTheDocument()

      await userEvent.setup().click(screen.getByRole('button', { name: 'Previous month' }))

      expect(await screen.findByText('Near limit: Bills & Utilities.')).toBeInTheDocument()
      expect(screen.queryByText(/Over budget: /)).not.toBeInTheDocument()
    })
  })
})
