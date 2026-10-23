// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import './test/setup'
import { listExpenses } from './api/expenses'
import { generateRecurring } from './api/recurring'
import { getSummary } from './api/summary'
import App from './App'

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
