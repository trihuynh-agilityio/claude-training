// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import '../test/setup'
import { AppShell } from './AppShell'

function setup(view: 'dashboard' | 'transactions' | 'budget' | 'recurring' = 'dashboard') {
  const onNavigate = vi.fn()
  const onAdd = vi.fn()
  render(
    <AppShell view={view} onNavigate={onNavigate} onAdd={onAdd}>
      <p>content</p>
    </AppShell>,
  )
  return { onNavigate, onAdd }
}

describe('AppShell navigation', () => {
  it('marks only the active view as the current page, in both navs', () => {
    setup('transactions')

    for (const nav of [
      screen.getByRole('navigation', { name: 'Main' }),
      screen.getByRole('navigation', { name: 'Main (mobile)' }),
    ]) {
      expect(within(nav).getByRole('button', { name: 'Transactions' })).toHaveAttribute(
        'aria-current',
        'page',
      )
      expect(within(nav).getByRole('button', { name: 'Dashboard' })).not.toHaveAttribute(
        'aria-current',
      )
    }
  })

  it('navigates from the sidebar and the bottom bar', async () => {
    const { onNavigate } = setup('dashboard')
    const user = userEvent.setup()

    await user.click(
      within(screen.getByRole('navigation', { name: 'Main' })).getByRole('button', {
        name: 'Transactions',
      }),
    )
    await user.click(
      within(screen.getByRole('navigation', { name: 'Main (mobile)' })).getByRole('button', {
        name: 'Dashboard',
      }),
    )

    expect(onNavigate).toHaveBeenNthCalledWith(1, 'transactions')
    expect(onNavigate).toHaveBeenNthCalledWith(2, 'dashboard')
  })

  it('navigates to Budget from the sidebar and the bottom bar', async () => {
    const { onNavigate } = setup('dashboard')
    const user = userEvent.setup()

    for (const name of ['Main', 'Main (mobile)']) {
      await user.click(
        within(screen.getByRole('navigation', { name })).getByRole('button', { name: 'Budget' }),
      )
    }

    expect(onNavigate).toHaveBeenNthCalledWith(1, 'budget')
    expect(onNavigate).toHaveBeenNthCalledWith(2, 'budget')
  })

  it('opens the add form from the floating button', async () => {
    const { onAdd } = setup()

    // The sidebar button and the mobile floating button share the name.
    const buttons = screen.getAllByRole('button', { name: 'Add expense' })
    expect(buttons).toHaveLength(2)
    await userEvent.setup().click(buttons[1])

    expect(onAdd).toHaveBeenCalled()
  })
})
