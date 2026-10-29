// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '../test/setup'
import { downloadTextFile } from '../lib/download'
import { todayISO } from '../lib/dates'
import type { Expense } from '../types'
import { TransactionsPage } from './TransactionsPage'

vi.mock('../lib/download', () => ({ downloadTextFile: vi.fn() }))
const mockDownload = vi.mocked(downloadTextFile)

const today = todayISO()

function expense(id: number, note: string): Expense {
  return {
    id,
    amount: 65_000,
    category_id: 'food',
    date: today,
    note,
    created_at: `${today}T00:00:00Z`,
  }
}

const EXPENSES = [expense(3, 'Grab to office'), expense(2, 'Phở bò'), expense(1, 'Grab home')]

const handlers = {
  onAdd: vi.fn(),
  onEdit: vi.fn(),
  onDuplicate: vi.fn(),
  onDelete: vi.fn(),
  onRetry: vi.fn(),
  onExported: vi.fn(),
}

function renderPage(props: Partial<Parameters<typeof TransactionsPage>[0]> = {}) {
  return render(
    <TransactionsPage
      expenses={EXPENSES}
      status="ready"
      showSkeleton={false}
      {...handlers}
      {...props}
    />,
  )
}

const exportButton = () => screen.getByRole('button', { name: /export csv/i })

beforeEach(() => vi.clearAllMocks())

describe('TransactionsPage export', () => {
  it('is enabled when rows match', () => {
    renderPage()
    expect(exportButton()).toBeEnabled()
  })

  it('is disabled with an empty list', () => {
    renderPage({ expenses: [] })
    expect(exportButton()).toBeDisabled()
  })

  it('is disabled when nothing matches the search', async () => {
    renderPage()
    await userEvent.type(screen.getByRole('searchbox'), 'zzz')
    expect(exportButton()).toBeDisabled()
  })

  it.each(['loading', 'error'] as const)('is disabled while %s', (status) => {
    renderPage({ status })
    expect(exportButton()).toBeDisabled()
  })

  it('exports only the rows matching the search', async () => {
    renderPage()
    await userEvent.type(screen.getByRole('searchbox'), 'grab')
    await userEvent.click(exportButton())
    expect(mockDownload).toHaveBeenCalledTimes(1)
    const [fileName, text] = mockDownload.mock.calls[0]
    expect(fileName).toMatch(/^expenses_\d{4}-\d{2}-01_\d{4}-\d{2}-\d{2}\.csv$/)
    expect(text).toContain('Grab to office')
    expect(text).toContain('Grab home')
    expect(text).not.toContain('Phở bò')
  })

  it('reports the count, singular for one', async () => {
    renderPage()
    await userEvent.click(exportButton())
    expect(handlers.onExported).toHaveBeenLastCalledWith('Exported 3 expenses')

    await userEvent.type(screen.getByRole('searchbox'), 'phở')
    await userEvent.click(exportButton())
    expect(handlers.onExported).toHaveBeenLastCalledWith('Exported 1 expense')
  })

  it('leaves the filters and list unchanged', async () => {
    renderPage()
    await userEvent.type(screen.getByRole('searchbox'), 'grab')
    const before = screen.getAllByRole('listitem').length
    await userEvent.click(exportButton())
    expect(screen.getByRole('searchbox')).toHaveValue('grab')
    expect(screen.getAllByRole('listitem')).toHaveLength(before)
    expect(handlers.onAdd).not.toHaveBeenCalled()
    expect(handlers.onRetry).not.toHaveBeenCalled()
  })

  it('follows a changed date range in both the rows and the file name', async () => {
    const old = { ...expense(9, 'Old trip'), date: '2020-01-15' }
    renderPage({ expenses: [...EXPENSES, old] })
    await userEvent.selectOptions(screen.getByLabelText('Date range'), 'custom')
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2020-01-01' } })
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2020-01-31' } })
    await userEvent.click(exportButton())
    const [fileName, text] = mockDownload.mock.calls[0]
    expect(fileName).toBe('expenses_2020-01-01_2020-01-31.csv')
    expect(text).toContain('Old trip')
    expect(text).not.toContain('Grab')
    expect(handlers.onExported).toHaveBeenLastCalledWith('Exported 1 expense')
  })
})
