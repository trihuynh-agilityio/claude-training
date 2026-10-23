import { describe, expect, it } from 'vitest'
import type { Expense } from '../types'
import { DEFAULT_FILTERS } from './filters'
import { exportFileName, expensesToCsv } from './csv'

function expense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 7,
    amount: 1_250_000,
    category_id: 'food',
    date: '2026-10-20',
    note: 'Lunch',
    created_at: '2026-10-20T05:00:00Z',
    ...overrides,
  }
}

const BOM = '﻿'

describe('expensesToCsv', () => {
  it('starts with the BOM and the exact header, with no id or created-at column', () => {
    expect(expensesToCsv([])).toBe(`${BOM}Date,Category,Amount (VND),Note\r\n`)
  })

  it('writes the date, category name, whole amount and note, rows ending in CRLF', () => {
    expect(expensesToCsv([expense()])).toBe(
      `${BOM}Date,Category,Amount (VND),Note\r\n2026-10-20,Food & Dining,1250000,Lunch\r\n`,
    )
  })

  it('keeps the order it is given, including a same-day pair', () => {
    const rows = expensesToCsv([
      expense({ id: 3, date: '2026-10-20', note: 'b' }),
      expense({ id: 2, date: '2026-10-20', note: 'a' }),
      expense({ id: 1, date: '2026-10-19', note: 'c' }),
    ])
    expect(
      rows
        .split('\r\n')
        .slice(1, 4)
        .map((line) => line.split(',')[3]),
    ).toEqual(['b', 'a', 'c'])
  })

  it('writes small and large amounts as plain whole numbers', () => {
    const csv = expensesToCsv([expense({ amount: 1 }), expense({ amount: 1_000_000_000 })])
    expect(csv).toContain(',1,')
    expect(csv).toContain(',1000000000,')
    expect(csv).not.toMatch(/[.₫]/)
  })

  it('gives an empty cell for a null or empty note', () => {
    const csv = expensesToCsv([expense({ note: null }), expense({ note: '' })])
    expect(csv.split('\r\n').slice(1, 3)).toEqual([
      '2026-10-20,Food & Dining,1250000,',
      '2026-10-20,Food & Dining,1250000,',
    ])
  })

  it('leaves Vietnamese text unchanged', () => {
    expect(expensesToCsv([expense({ note: 'Phở bò — Bách Hóa Xanh' })])).toContain(
      ',Phở bò — Bách Hóa Xanh\r\n',
    )
  })

  it('quotes fields with a comma, quote or line break and doubles inner quotes', () => {
    expect(expensesToCsv([expense({ note: 'a, b' })])).toContain(',"a, b"\r\n')
    expect(expensesToCsv([expense({ note: 'say "hi"' })])).toContain(',"say ""hi"""\r\n')
    expect(expensesToCsv([expense({ note: 'one\ntwo' })])).toContain(',"one\ntwo"\r\n')
  })

  it.each(['=SUM(1,2)', '+1', '-50k refund', '@cmd'])(
    'prefixes a note starting with %s',
    (note) => {
      const line = expensesToCsv([expense({ note })]).split('\r\n')[1]
      expect(line).toContain(`'${note}`)
    },
  )

  it('does not prefix characters in the middle or notes starting with a letter or digit', () => {
    const csv = expensesToCsv([expense({ note: 'a=b' }), expense({ note: '5-1' })])
    expect(csv).not.toContain("'")
  })
})

describe('exportFileName', () => {
  const today = '2026-10-23'
  const name = (filters: Partial<typeof DEFAULT_FILTERS>) =>
    exportFileName({ ...DEFAULT_FILTERS, ...filters }, today)

  it('uses the preset range bounds', () => {
    expect(name({ range: 'this-month' })).toBe('expenses_2026-10-01_2026-10-23.csv')
    expect(name({ range: 'last-7-days' })).toBe('expenses_2026-10-17_2026-10-23.csv')
    expect(name({ range: 'last-month' })).toBe('expenses_2026-09-01_2026-09-30.csv')
  })

  it('uses both custom dates when set', () => {
    expect(name({ range: 'custom', from: '2026-08-01', to: '2026-08-15' })).toBe(
      'expenses_2026-08-01_2026-08-15.csv',
    )
  })

  it('falls back to today when a custom side is missing', () => {
    expect(name({ range: 'custom', from: '2026-08-01' })).toBe('expenses_2026-10-23.csv')
    expect(name({ range: 'custom', to: '2026-08-01' })).toBe('expenses_2026-10-23.csv')
    expect(name({ range: 'custom' })).toBe('expenses_2026-10-23.csv')
  })
})
