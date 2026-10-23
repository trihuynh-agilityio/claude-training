import type { Expense } from '../types'
import { getCategory } from './categories'
import { todayISO } from './dates'
import { rangeBounds, type Filters } from './filters'

const BOM = '﻿'
const HEADER = ['Date', 'Category', 'Amount (VND)', 'Note']

function escapeField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/** A leading quote makes spreadsheets show a would-be formula as text. */
function guardFormula(note: string): string {
  return /^[=+\-@]/.test(note) ? `'${note}` : note
}

/** CSV text for the given expenses, in the order given: BOM, header, CRLF rows. */
export function expensesToCsv(expenses: Expense[]): string {
  const rows = expenses.map((expense) => [
    expense.date,
    getCategory(expense.category_id).name,
    String(expense.amount),
    guardFormula(expense.note ?? ''),
  ])
  return BOM + [HEADER, ...rows].map((row) => row.map(escapeField).join(',') + '\r\n').join('')
}

/** `expenses_<from>_<to>.csv` for the active range, or `expenses_<today>.csv` when a custom side is open. */
export function exportFileName(filters: Filters, today: string = todayISO()): string {
  const { from, to } = rangeBounds(filters.range, today) ?? { from: filters.from, to: filters.to }
  return from && to ? `expenses_${from}_${to}.csv` : `expenses_${today}.csv`
}
