import { afterEach, expect, it, vi } from 'vitest'
import { getSummary } from './summary'

afterEach(() => vi.unstubAllGlobals())

it('asks for the month and sends the browser’s date', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })))

  await getSummary('2026-09', '2026-10-21')

  expect(fetch).toHaveBeenCalledWith(
    '/api/summary?month=2026-09&today=2026-10-21',
    expect.anything(),
  )
})
