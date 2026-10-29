// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import '../test/setup'
import { CopyIcon } from './icons'

describe('CopyIcon', () => {
  it('renders an 18 wide hidden svg by default', () => {
    const { container } = render(<CopyIcon />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg?.getAttribute('width')).toBe('18')
    expect(svg?.getAttribute('aria-hidden')).toBe('true')
  })

  it('uses a given size', () => {
    const { container } = render(<CopyIcon size={24} />)
    expect(container.querySelector('svg')?.getAttribute('width')).toBe('24')
  })
})
