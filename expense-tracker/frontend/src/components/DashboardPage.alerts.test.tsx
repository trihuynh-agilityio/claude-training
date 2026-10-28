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
const BUDGET = 1_000_000
const BIG = 100_000_000
const STRIP_TEXT = /Over budget:|Near limit:/

function budget(
  monthly: number,
  categories: Partial<Record<CategoryId, number>> = {},
  month = OCTOBER,
): Budget {
  return { month, source_month: month, is_own: true, monthly, categories }
}

/** A summary whose total and per-category spending are given directly. */
function summary(
  total: number,
  spent: Partial<Record<CategoryId, number>>,
  b: Budget | null,
  month = OCTOBER,
): MonthlySummary {
  return {
    month,
    total,
    count: total > 0 ? 3 : 0,
    same_day_last_month_total: 0,
    categories: (Object.keys(spent) as CategoryId[]).map((category_id) => ({
      category_id,
      total: spent[category_id] ?? 0,
      count: 1,
    })),
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
  return { rerenderVersion: (version: number) => view.rerender(ui(version)) }
}

/** Resolves once the summary has loaded (the month heading or empty state shows). */
async function loaded() {
  await waitFor(() => expect(mockGetSummary).toHaveBeenCalled())
  await screen.findByText(/Spent (this month|in )|No expenses in/)
}

async function show(s: MonthlySummary) {
  mockGetSummary.mockResolvedValue(s)
  const view = renderPage()
  await loaded()
  return view
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 21, 12))
  mockGetSummary.mockReset()
  Object.values(handlers).forEach((handler) => handler.mockReset())
})

afterEach(() => vi.useRealTimers())

describe('Dashboard budget alert strip', () => {
  describe('R1 and R2: when it shows', () => {
    it('shows nothing when every item is under 85%', async () => {
      await show(summary(500_000, { food: 100_000 }, budget(BUDGET, { food: 200_000 })))
      expect(screen.queryByText(STRIP_TEXT)).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'View budget' })).not.toBeInTheDocument()
    })

    it('shows the strip when one item is near the limit', async () => {
      await show(summary(100_000, { food: 180_000 }, budget(BIG, { food: 200_000 })))
      expect(screen.getByText(STRIP_TEXT)).toBeInTheDocument()
    })

    it('shows the strip when one item is over budget', async () => {
      await show(summary(100_000, { food: 250_000 }, budget(BIG, { food: 200_000 })))
      expect(screen.getByText(STRIP_TEXT)).toBeInTheDocument()
    })

    it('never names a category that has spending but no budget', async () => {
      await show(summary(5_000_000, { transport: 4_000_000 }, budget(BIG, { food: 200_000 })))
      expect(screen.queryByText(STRIP_TEXT)).not.toBeInTheDocument()
    })

    it('does not name a budgeted category with no expenses', async () => {
      await show(summary(100_000, { other: 100_000 }, budget(BIG, { food: 200_000 })))
      expect(screen.queryByText(STRIP_TEXT)).not.toBeInTheDocument()
    })

    it('shows no strip without a budget and keeps the invite', async () => {
      await show(summary(5_000_000, { food: 5_000_000 }, null))
      expect(screen.queryByText(STRIP_TEXT)).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Set a monthly budget' })).toBeInTheDocument()
    })

    it('shows no strip in a month with no expenses', async () => {
      await show(summary(0, {}, budget(BUDGET, { food: 200_000 })))
      expect(screen.queryByText(STRIP_TEXT)).not.toBeInTheDocument()
    })
  })

  describe('R3: boundaries on a 1.000.000 budget', () => {
    it.each([
      [849_999, null],
      [850_000, 'Near limit: '],
      [1_000_000, 'Near limit: '],
      [1_000_001, 'Over budget: '],
    ])('category spending %i', async (spent, label) => {
      await show(summary(spent, { food: spent }, budget(BIG, { food: BUDGET })))
      if (label === null) {
        expect(screen.queryByText(STRIP_TEXT)).not.toBeInTheDocument()
      } else {
        expect(screen.getByText(`${label}Food & Dining.`)).toBeInTheDocument()
      }
    })

    it.each([
      [849_999, null],
      [850_000, 'Near limit: '],
      [1_000_000, 'Near limit: '],
      [1_000_001, 'Over budget: '],
    ])('monthly spending %i', async (spent, label) => {
      await show(summary(spent, {}, budget(BUDGET)))
      if (label === null) {
        expect(screen.queryByText(STRIP_TEXT)).not.toBeInTheDocument()
      } else {
        expect(screen.getByText(`${label}Monthly budget.`)).toBeInTheDocument()
      }
    })
  })

  describe('R4: the text', () => {
    it('lists over-budget then near-limit items with the exact wording', async () => {
      await show(
        summary(
          1_300_000,
          { food: 1_000_000, bills: 300_000 },
          budget(BUDGET, { food: 400_000, bills: 340_000 }),
        ),
      )
      expect(
        screen.getByText(
          'Over budget: Food & Dining, Monthly budget. Near limit: Bills & Utilities.',
        ),
      ).toBeInTheDocument()
    })

    it('leaves out the over-budget part when nothing is over', async () => {
      await show(summary(100_000, { bills: 300_000 }, budget(BIG, { bills: 340_000 })))
      expect(screen.getByText('Near limit: Bills & Utilities.')).toBeInTheDocument()
      expect(screen.queryByText(/Over budget:/)).not.toBeInTheDocument()
    })

    it('leaves out the near-limit part when nothing is near', async () => {
      await show(summary(100_000, { food: 1_000_000 }, budget(BIG, { food: 400_000 })))
      expect(screen.getByText('Over budget: Food & Dining.')).toBeInTheDocument()
      expect(screen.queryByText(/Near limit:/)).not.toBeInTheDocument()
    })
  })

  describe('R5: order', () => {
    it('orders each list by percent used, highest first', async () => {
      // Listed lowest first on purpose: shopping 150%, food 250%, transport 90%, bills 95%.
      await show(
        summary(
          100_000,
          { shopping: 150_000, food: 250_000, transport: 90_000, bills: 95_000 },
          budget(BIG, { shopping: 100_000, food: 100_000, transport: 100_000, bills: 100_000 }),
        ),
      )
      expect(
        screen.getByText(
          'Over budget: Food & Dining, Shopping. Near limit: Bills & Utilities, Transport.',
        ),
      ).toBeInTheDocument()
    })
  })

  describe('R6: View budget', () => {
    it('opens the Budget screen once when clicked', async () => {
      await show(summary(100_000, { food: 250_000 }, budget(BIG, { food: 200_000 })))
      await userEvent.setup().click(screen.getByRole('button', { name: 'View budget' }))
      expect(handlers.onOpenBudget).toHaveBeenCalledTimes(1)
    })
  })

  describe('R7: it follows the data', () => {
    it('has no close button', async () => {
      await show(summary(100_000, { food: 250_000 }, budget(BIG, { food: 200_000 })))
      expect(screen.getByText(STRIP_TEXT)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /close|dismiss/i })).not.toBeInTheDocument()
    })

    it('disappears when a refetch has nothing near or over', async () => {
      mockGetSummary
        .mockResolvedValueOnce(summary(100_000, { food: 250_000 }, budget(BIG, { food: 200_000 })))
        .mockResolvedValue(summary(100_000, { food: 50_000 }, budget(BIG, { food: 200_000 })))
      const { rerenderVersion } = renderPage()
      await loaded()
      expect(screen.getByText('Over budget: Food & Dining.')).toBeInTheDocument()

      rerenderVersion(1)

      await waitFor(() => expect(screen.queryByText(STRIP_TEXT)).not.toBeInTheDocument())
    })

    it('shows the strip of the month picked in the month switcher', async () => {
      mockGetSummary.mockImplementation((month) =>
        Promise.resolve(
          month === OCTOBER
            ? summary(100_000, { food: 250_000 }, budget(BIG, { food: 200_000 }))
            : summary(100_000, { bills: 95_000 }, budget(BIG, { bills: 100_000 }, month), month),
        ),
      )
      renderPage()
      await loaded()
      expect(screen.getByText('Over budget: Food & Dining.')).toBeInTheDocument()

      await userEvent.setup().click(screen.getByRole('button', { name: 'Previous month' }))

      expect(await screen.findByText('Near limit: Bills & Utilities.')).toBeInTheDocument()
      expect(screen.queryByText(/Over budget:/)).not.toBeInTheDocument()
    })
  })
})
