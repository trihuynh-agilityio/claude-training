// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import '../test/setup'
import type { CategoryId } from '../lib/categories'
import type { MonthlySummary } from '../types'
import { BudgetAlertStrip } from './BudgetAlertStrip'

function summary(
  spent: Partial<Record<CategoryId, number>>,
  limits: Partial<Record<CategoryId, number>>,
) {
  const categories = Object.entries(spent).map(([category_id, total]) => ({
    category_id: category_id as CategoryId,
    total: total as number,
    count: 1,
  }))
  return {
    month: '2026-10',
    total: categories.reduce((sum, item) => sum + item.total, 0),
    count: categories.length,
    same_day_last_month_total: 0,
    categories,
    budget: {
      month: '2026-10',
      source_month: '2026-10',
      is_own: true,
      monthly: 100_000_000,
      categories: limits,
    },
  } as MonthlySummary
}

describe('BudgetAlertStrip', () => {
  it('renders nothing with no items', () => {
    const { container } = render(
      <BudgetAlertStrip summary={summary({ food: 100 }, { food: 1000 })} onOpenBudget={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the text with the over modifier for an over item', () => {
    const value = summary({ food: 1200, bills: 900 }, { food: 1000, bills: 1000 })
    const { container } = render(<BudgetAlertStrip summary={value} onOpenBudget={vi.fn()} />)
    expect(
      screen.getByText('Over budget: Food & Dining. Near limit: Bills & Utilities.'),
    ).toBeInTheDocument()
    expect(container.firstElementChild).toHaveClass('is-over')
  })

  it('uses the near modifier with only near items', () => {
    const { container } = render(
      <BudgetAlertStrip summary={summary({ food: 900 }, { food: 1000 })} onOpenBudget={vi.fn()} />,
    )
    expect(screen.getByText('Near limit: Food & Dining.')).toBeInTheDocument()
    expect(container.firstElementChild).toHaveClass('is-near')
    expect(container.firstElementChild).not.toHaveClass('is-over')
  })

  it('is not a live region and has no close button', () => {
    const { container } = render(
      <BudgetAlertStrip summary={summary({ food: 1200 }, { food: 1000 })} onOpenBudget={vi.fn()} />,
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(container.querySelector('[aria-live]')).toBeNull()
    expect(screen.queryByRole('button', { name: /close|dismiss/i })).not.toBeInTheDocument()
  })

  it('calls onOpenBudget from View budget', async () => {
    const onOpenBudget = vi.fn()
    render(
      <BudgetAlertStrip
        summary={summary({ food: 1200 }, { food: 1000 })}
        onOpenBudget={onOpenBudget}
      />,
    )
    await userEvent.setup().click(screen.getByRole('button', { name: 'View budget' }))
    expect(onOpenBudget).toHaveBeenCalledTimes(1)
  })
})
