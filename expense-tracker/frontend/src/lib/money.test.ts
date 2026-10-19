import { describe, expect, it } from 'vitest'
import { digitsOnly, formatVND, groupDigits } from './money'

const NBSP = ' '

describe('formatVND', () => {
  it('groups thousands with dots and appends ₫ after a no-break space', () => {
    expect(formatVND(1_250_000)).toBe(`1.250.000${NBSP}₫`)
    expect(formatVND(65_000)).toBe(`65.000${NBSP}₫`)
    expect(formatVND(1)).toBe(`1${NBSP}₫`)
  })

  it('never shows decimals', () => {
    expect(formatVND(1_000_000_000)).toBe(`1.000.000.000${NBSP}₫`)
  })
})

describe('digitsOnly', () => {
  it('strips grouping dots, spaces and letters', () => {
    expect(digitsOnly('1.250.000 ₫')).toBe('1250000')
    expect(digitsOnly('65k')).toBe('65')
  })

  it('drops leading zeros but keeps a single 0', () => {
    expect(digitsOnly('00065000')).toBe('65000')
    expect(digitsOnly('0')).toBe('0')
  })

  it('caps the length at 13 digits', () => {
    expect(digitsOnly('12345678901234567')).toBe('1234567890123')
  })
})

describe('groupDigits', () => {
  it('formats digits for the amount input without a symbol', () => {
    expect(groupDigits('1250000')).toBe('1.250.000')
    expect(groupDigits('500')).toBe('500')
  })

  it('keeps an empty input empty', () => {
    expect(groupDigits('')).toBe('')
  })
})
