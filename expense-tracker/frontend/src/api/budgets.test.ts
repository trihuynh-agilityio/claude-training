import { afterEach, expect, it, vi } from 'vitest'
import { getBudget, saveBudget } from './budgets'

afterEach(() => vi.unstubAllGlobals())

const ok = (body: unknown) => vi.fn().mockResolvedValue(new Response(JSON.stringify(body)))

it('asks for the budget in force for a month and sends the browser’s date', async () => {
  vi.stubGlobal('fetch', ok(null))

  await expect(getBudget('2026-10', '2026-10-21')).resolves.toBeNull()

  expect(fetch).toHaveBeenCalledWith(
    '/api/budgets?month=2026-10&today=2026-10-21',
    expect.anything(),
  )
})

it('replaces a month’s budget with a PUT', async () => {
  vi.stubGlobal('fetch', ok({}))
  const input = { monthly: 1000, categories: { food: 600 } }

  await saveBudget('2026-10', input, '2026-10-21')

  expect(fetch).toHaveBeenCalledWith(
    '/api/budgets/2026-10?today=2026-10-21',
    expect.objectContaining({ method: 'PUT', body: JSON.stringify(input) }),
  )
})

it('encodes what it puts in the URL', async () => {
  vi.stubGlobal('fetch', ok({}))

  await saveBudget('2026-10/../x', { monthly: 1000, categories: {} }, 'a&b=c')

  expect(fetch).toHaveBeenCalledWith(
    '/api/budgets/2026-10%2F..%2Fx?today=a%26b%3Dc',
    expect.anything(),
  )
})
