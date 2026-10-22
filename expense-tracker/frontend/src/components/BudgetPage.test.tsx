// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '../test/setup'
import { saveBudget } from '../api/budgets'
import { ApiError } from '../api/client'
import { getSummary } from '../api/summary'
import type { Budget, MonthlySummary } from '../types'
import { BudgetPage } from './BudgetPage'

vi.mock('../api/summary', () => ({ getSummary: vi.fn() }))
vi.mock('../api/budgets', () => ({ saveBudget: vi.fn() }))
const mockGetSummary = vi.mocked(getSummary)
const mockSaveBudget = vi.mocked(saveBudget)

const OCTOBER = '2026-10'

function budget(overrides: Partial<Budget> = {}): Budget {
  return {
    month: OCTOBER,
    source_month: OCTOBER,
    is_own: true,
    monthly: 10_000_000,
    categories: {},
    ...overrides,
  }
}

function summary(overrides: Partial<MonthlySummary> = {}): MonthlySummary {
  return {
    month: OCTOBER,
    total: 0,
    count: 0,
    same_day_last_month_total: 0,
    categories: [],
    budget: null,
    ...overrides,
  }
}

const onSaved = vi.fn()

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 21, 12))
  mockGetSummary.mockReset()
  mockSaveBudget.mockReset()
  onSaved.mockReset()
})

afterEach(() => vi.useRealTimers())

const renderPage = () => render(<BudgetPage version={0} onSaved={onSaved} />)

describe('BudgetPage', () => {
  it('invites the user to set a budget when there is none', async () => {
    mockGetSummary.mockResolvedValue(summary())
    renderPage()

    expect(await screen.findByRole('button', { name: 'Set a monthly budget' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit budgets' })).not.toBeInTheDocument()
  })

  it('shows monthly, spent, remaining and allocated', async () => {
    mockGetSummary.mockResolvedValue(
      summary({
        total: 4_000_000,
        count: 3,
        categories: [{ category_id: 'food', total: 4_000_000, count: 3 }],
        budget: budget({ categories: { food: 6_000_000 } }),
      }),
    )
    renderPage()

    expect(await screen.findByText('Monthly budget')).toBeInTheDocument()
    expect(screen.getByText('Spent').nextSibling).toHaveTextContent(/4\.000\.000.*40%/)
    expect(screen.getByText('Remaining').nextSibling).toHaveTextContent(/6\.000\.000/)
    expect(screen.getByText('Allocated to categories').nextSibling).toHaveTextContent(
      /6\.000\.000.*4\.000\.000 ₫ unallocated/,
    )
  })

  it('sorts categories Over budget, Near limit, then by % used', async () => {
    const spent = (category_id: 'food' | 'bills' | 'health' | 'leisure', total: number) => ({
      category_id,
      total,
      count: 1,
    })
    mockGetSummary.mockResolvedValue(
      summary({
        total: 1,
        count: 1,
        categories: [
          spent('food', 100), // 10%
          spent('bills', 900), // 90%, near limit
          spent('health', 1200), // 120%, over
          spent('leisure', 500), // 50%
        ],
        budget: budget({
          categories: { food: 1000, bills: 1000, health: 1000, leisure: 1000 },
        }),
      }),
    )
    renderPage()

    const rows = await screen.findAllByRole('listitem')
    expect(rows.map((row) => /Food|Bills|Health|Leisure/.exec(row.textContent!)?.[0])).toEqual([
      'Health',
      'Bills',
      'Leisure',
      'Food',
    ])
    expect(screen.getByText('1 Over budget')).toBeInTheDocument()
    expect(screen.getByText('1 Near limit')).toBeInTheDocument()
  })

  it('says which month an inherited budget comes from', async () => {
    mockGetSummary.mockResolvedValue(
      summary({ budget: budget({ is_own: false, source_month: '2026-09' }) }),
    )
    renderPage()

    expect(await screen.findByText(/Using the budget from September 2026/)).toBeInTheDocument()
  })

  it('makes a past month read only', async () => {
    mockGetSummary.mockImplementation((month) =>
      Promise.resolve(summary({ month, budget: budget({ month }) })),
    )
    renderPage()
    await screen.findByRole('button', { name: 'Edit budgets' })

    await userEvent.setup().click(screen.getByRole('button', { name: 'Previous month' }))

    expect(await screen.findByText('September 2026')).toBeInTheDocument()
    await screen.findByText('Monthly budget')
    expect(screen.queryByRole('button', { name: 'Edit budgets' })).not.toBeInTheDocument()
  })

  it('can look one month ahead but no further', async () => {
    mockGetSummary.mockImplementation((month) => Promise.resolve(summary({ month })))
    renderPage()
    const user = userEvent.setup()
    await screen.findByText('October 2026')

    await user.click(screen.getByRole('button', { name: 'Next month' }))

    expect(await screen.findByText('November 2026')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled()
    expect(await screen.findByRole('button', { name: 'Set a monthly budget' })).toBeInTheDocument()
  })

  it('locks the month switcher while a save is in flight', async () => {
    mockGetSummary.mockResolvedValue(summary())
    let finish!: (value: Budget) => void
    mockSaveBudget.mockReturnValue(new Promise((resolve) => (finish = resolve)))
    renderPage()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Set a monthly budget' }))
    await user.type(screen.getByLabelText('Monthly budget'), '1000')

    await user.click(screen.getByRole('button', { name: 'Save budget' }))

    expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeDisabled()
    finish(budget())
    expect(await screen.findByRole('button', { name: 'Previous month' })).toBeEnabled()
  })

  describe('editing', () => {
    async function openForm() {
      mockGetSummary.mockResolvedValue(summary())
      renderPage()
      const user = userEvent.setup()
      await user.click(await screen.findByRole('button', { name: 'Set a monthly budget' }))
      return user
    }

    it('disables Save and explains a missing or zero monthly budget', async () => {
      const user = await openForm()
      const save = screen.getByRole('button', { name: 'Save budget' })

      expect(screen.getByText('Enter a monthly budget.')).toBeInTheDocument()
      expect(save).toBeDisabled()

      await user.type(screen.getByLabelText('Monthly budget'), '0')

      expect(screen.getByText('Monthly budget must be greater than 0 ₫.')).toBeInTheDocument()
      expect(save).toBeDisabled()
    })

    it('rejects a category budget of 0 and categories above the monthly budget', async () => {
      const user = await openForm()
      const save = screen.getByRole('button', { name: 'Save budget' })
      await user.type(screen.getByLabelText('Monthly budget'), '1000')

      await user.type(screen.getByLabelText('Food & Dining budget'), '0')
      expect(screen.getByText('Category budget must be greater than 0 ₫.')).toBeInTheDocument()
      expect(save).toBeDisabled()

      await user.clear(screen.getByLabelText('Food & Dining budget'))
      await user.type(screen.getByLabelText('Food & Dining budget'), '600')
      await user.type(screen.getByLabelText('Transport budget'), '401')

      expect(
        screen.getByText('Category budgets add up to more than the monthly budget.'),
      ).toBeInTheDocument()
      expect(save).toBeDisabled()
      expect(mockSaveBudget).not.toHaveBeenCalled()
    })

    it('saves a valid budget for the month and shows the result', async () => {
      const user = await openForm()
      mockSaveBudget.mockResolvedValue(budget())
      await user.type(screen.getByLabelText('Monthly budget'), '15000000')
      await user.type(screen.getByLabelText('Food & Dining budget'), '4500000')

      await user.click(screen.getByRole('button', { name: 'Save budget' }))

      expect(mockSaveBudget).toHaveBeenCalledWith(
        OCTOBER,
        { monthly: 15_000_000, categories: { food: 4_500_000 } },
        '2026-10-21',
      )
      expect(onSaved).toHaveBeenCalledWith('Budget saved')
      expect(screen.queryByRole('button', { name: 'Save budget' })).not.toBeInTheDocument()
    })

    it('keeps the form open and shows the API’s message when saving fails', async () => {
      const user = await openForm()
      mockSaveBudget.mockRejectedValue(
        new ApiError(422, 'Budgets for past months can’t be changed.'),
      )
      await user.type(screen.getByLabelText('Monthly budget'), '1000')

      await user.click(screen.getByRole('button', { name: 'Save budget' }))

      const alert = await screen.findByRole('alert')
      expect(
        within(alert).getByText('Budgets for past months can’t be changed.'),
      ).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Save budget' })).toBeEnabled()
      expect(onSaved).not.toHaveBeenCalled()
    })

    it('starts from the current budget when editing', async () => {
      mockGetSummary.mockResolvedValue(
        summary({ budget: budget({ categories: { food: 2_000_000 } }) }),
      )
      renderPage()
      const user = userEvent.setup()

      await user.click(await screen.findByRole('button', { name: 'Edit budgets' }))

      expect(screen.getByLabelText('Monthly budget')).toHaveValue('10.000.000')
      expect(screen.getByLabelText('Food & Dining budget')).toHaveValue('2.000.000')
      expect(screen.getByLabelText('Transport budget')).toHaveValue('')
    })
  })
})
