// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import '../test/setup'
import { CategoryBreakdown } from './CategoryBreakdown'

describe('CategoryBreakdown', () => {
  const categories = [
    { category_id: 'bills' as const, total: 750_000, count: 1 },
    { category_id: 'food' as const, total: 250_000, count: 2 },
  ]

  it('lists each category with its amount and share, in the order given', () => {
    render(<CategoryBreakdown categories={categories} total={1_000_000} />)

    const rows = screen.getAllByRole('listitem')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('Bills & Utilities')
    expect(rows[0]).toHaveTextContent('75%')
    expect(rows[0]).toHaveTextContent('750.000')
    expect(rows[1]).toHaveTextContent('Food & Dining')
    expect(rows[1]).toHaveTextContent('25%')
  })

  it('describes the stacked bar in text, not only color', () => {
    render(<CategoryBreakdown categories={categories} total={1_000_000} />)

    expect(screen.getByRole('img')).toHaveAccessibleName(
      'Share of spending: Bills & Utilities 75%, Food & Dining 25%',
    )
  })
})
