// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '../test/setup'
import {
  createRecurring,
  deleteRecurring,
  generateRecurring,
  listRecurring,
  setRecurringPaused,
  updateRecurring,
} from '../api/recurring'
import type { Recurring } from '../types'
import { RecurringPage } from './RecurringPage'

// jsdom has no <dialog> modal support.
HTMLDialogElement.prototype.showModal = function () {
  this.setAttribute('open', '')
}
HTMLDialogElement.prototype.close = function () {
  this.removeAttribute('open')
}

vi.mock('../api/recurring', () => ({
  listRecurring: vi.fn(),
  createRecurring: vi.fn(),
  updateRecurring: vi.fn(),
  setRecurringPaused: vi.fn(),
  deleteRecurring: vi.fn(),
  generateRecurring: vi.fn(),
}))
const mockList = vi.mocked(listRecurring)
const mockCreate = vi.mocked(createRecurring)
const mockUpdate = vi.mocked(updateRecurring)
const mockPause = vi.mocked(setRecurringPaused)
const mockDelete = vi.mocked(deleteRecurring)
const mockGenerate = vi.mocked(generateRecurring)

function rule(overrides: Partial<Recurring> = {}): Recurring {
  return {
    id: 1,
    amount: 5_000_000,
    category_id: 'bills',
    note: 'Rent',
    day: 5,
    start_date: '2026-08-05',
    end_date: null,
    paused: false,
    last_generated: '2026-10-05',
    next_due: '2026-11-05',
    ...overrides,
  }
}

function setup() {
  const onChanged = vi.fn()
  const onToast = vi.fn()
  render(<RecurringPage onChanged={onChanged} onToast={onToast} />)
  return { onChanged, onToast, user: userEvent.setup() }
}

beforeEach(() => {
  vi.resetAllMocks()
  mockList.mockResolvedValue([])
  mockGenerate.mockResolvedValue({ added: 0 })
})

describe('RecurringPage', () => {
  it('shows the empty state with an add action', async () => {
    setup()

    expect(await screen.findByText('No recurring expenses yet')).toBeInTheDocument()
    expect(
      screen.getByText('Add rent, subscriptions and other monthly costs once.'),
    ).toBeInTheDocument()
  })

  it('lists rules with day, amount and next due date', async () => {
    mockList.mockResolvedValue([rule()])
    setup()

    const row = (await screen.findByText('Rent')).closest('li')!
    expect(within(row).getByText(/Day 5 of every month/)).toBeInTheDocument()
    expect(within(row).getByText('Next: Thu 5 Nov')).toBeInTheDocument()
    expect(within(row).getByText(/5\.000\.000/)).toBeInTheDocument()
  })

  it('shows Paused and Ended instead of a date', async () => {
    mockList.mockResolvedValue([
      rule({ id: 1, note: 'Gym', paused: true }),
      rule({ id: 2, note: 'Loan', end_date: '2026-10-05' }),
    ])
    setup()

    expect(await screen.findByText('Paused')).toBeInTheDocument()
    expect(screen.getByText('Ended')).toBeInTheDocument()
  })

  it('pauses and resumes through the API', async () => {
    mockList.mockResolvedValue([rule()])
    mockPause.mockResolvedValue(rule({ paused: true }))
    const { user, onToast } = setup()

    await user.click(await screen.findByRole('button', { name: 'Pause Rent' }))

    expect(mockPause).toHaveBeenCalledWith(1, true, expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/))
    expect(onToast).toHaveBeenCalledWith('Paused')
  })

  it('deletes only after confirming', async () => {
    mockList.mockResolvedValue([rule()])
    mockDelete.mockResolvedValue(undefined)
    const { user, onToast, onChanged } = setup()

    await user.click(await screen.findByRole('button', { name: 'Delete Rent' }))
    expect(mockDelete).not.toHaveBeenCalled()
    expect(screen.getByText(/Expenses it already added are kept/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Delete recurring expense' }))

    expect(mockDelete).toHaveBeenCalledWith(1)
    expect(onToast).toHaveBeenCalledWith('Recurring expense deleted')
    expect(onChanged).toHaveBeenCalled()
  })

  it('shows the validation messages and does not call the API', async () => {
    const { user } = setup()
    await user.click(
      await screen.findAllByRole('button', { name: 'Add recurring expense' }).then((b) => b[0]),
    )

    await user.type(screen.getByLabelText('Day of month'), '32')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Fix 3 fields')
    expect(screen.getByText('Enter an amount.')).toBeInTheDocument()
    expect(screen.getByText('Choose a category.')).toBeInTheDocument()
    expect(screen.getByText('Enter a day from 1 to 31.')).toBeInTheDocument()
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('saves a rule, catches up and tells the app', async () => {
    mockCreate.mockResolvedValue(rule())
    mockGenerate.mockResolvedValue({ added: 3 })
    const { user, onChanged, onToast } = setup()
    await user.click((await screen.findAllByRole('button', { name: 'Add recurring expense' }))[0])

    await user.type(screen.getByLabelText('Amount'), '5000000')
    await user.click(screen.getByRole('button', { name: /Bills/ }))
    await user.type(screen.getByLabelText('Day of month'), '5')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 5_000_000, category_id: 'bills', day: 5, end_date: null }),
      expect.any(String),
    )
    expect(mockGenerate).toHaveBeenCalled()
    expect(onChanged).toHaveBeenCalled()
    expect(onToast).toHaveBeenCalledWith('Recurring expense added')
  })

  it('skips the catch-up when an edit cannot add expenses', async () => {
    mockList.mockResolvedValue([rule()])
    mockUpdate.mockResolvedValue(rule({ note: 'Flat' }))
    const { user, onChanged } = setup()

    await user.click(await screen.findByRole('button', { name: 'Edit Rent' }))
    const note = screen.getByLabelText(/Note/)
    await user.clear(note)
    await user.type(note, 'Flat')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(mockUpdate).toHaveBeenCalled()
    expect(mockGenerate).not.toHaveBeenCalled()
    expect(onChanged).not.toHaveBeenCalled()
  })
})
