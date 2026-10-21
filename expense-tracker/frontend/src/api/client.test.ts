import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, request } from './client'

function respond(status: number, body?: unknown) {
  const response = new Response(body === undefined ? null : JSON.stringify(body), { status })
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))
}

afterEach(() => vi.unstubAllGlobals())

describe('request', () => {
  it('returns the parsed JSON body', async () => {
    respond(200, { total: 5 })
    await expect(request('/api/x')).resolves.toEqual({ total: 5 })
  })

  it('sends JSON headers and merges the caller’s init', async () => {
    respond(200, {})
    await request('/api/x', { method: 'POST', body: '{}' })
    expect(fetch).toHaveBeenCalledWith(
      '/api/x',
      expect.objectContaining({ method: 'POST', headers: { 'Content-Type': 'application/json' } }),
    )
  })

  it('returns undefined for 204 without reading a body', async () => {
    respond(204)
    await expect(request('/api/x', { method: 'DELETE' })).resolves.toBeUndefined()
  })

  it('throws an ApiError with the detail string FastAPI sends for 404', async () => {
    respond(404, { detail: 'Expense not found' })
    await expect(request('/api/x')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      message: 'Expense not found',
    })
  })

  it('falls back to a generic message for 422 list details', async () => {
    respond(422, { detail: [{ msg: 'bad' }] })
    const error = await request('/api/x').catch((caught) => caught)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 422, message: 'Request failed (422)' })
  })

  it('falls back to a generic message when the error body is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('boom', { status: 500 })))
    await expect(request('/api/x')).rejects.toMatchObject({
      status: 500,
      message: 'Request failed (500)',
    })
  })
})
