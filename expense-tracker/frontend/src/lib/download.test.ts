// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { downloadTextFile } from './download'

describe('downloadTextFile', () => {
  afterEach(() => vi.restoreAllMocks())

  it('clicks a temporary link with the file name, removes it, then releases the URL', () => {
    vi.useFakeTimers()
    const createObjectURL = vi.fn(() => 'blob:test')
    const revokeObjectURL = vi.fn()
    Object.assign(URL, { createObjectURL, revokeObjectURL })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    downloadTextFile('expenses_2026-10-23.csv', 'a,b')

    const clicked = click.mock.contexts[0] as HTMLAnchorElement
    expect(clicked.download).toBe('expenses_2026-10-23.csv')
    expect(clicked.getAttribute('href')).toBe('blob:test')
    expect(document.body.contains(clicked)).toBe(false)
    expect(revokeObjectURL).not.toHaveBeenCalled()
    vi.runAllTimers()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test')
    vi.useRealTimers()
  })
})
