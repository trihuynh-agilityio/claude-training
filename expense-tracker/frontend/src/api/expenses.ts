import type { Expense, ExpenseInput } from '../types'
import { request } from './client'

export function listExpenses(): Promise<Expense[]> {
  return request('/api/expenses')
}

export function createExpense(input: ExpenseInput): Promise<Expense> {
  return request('/api/expenses', { method: 'POST', body: JSON.stringify(input) })
}

export function updateExpense(id: number, input: ExpenseInput): Promise<Expense> {
  return request(`/api/expenses/${id}`, { method: 'PUT', body: JSON.stringify(input) })
}

export function deleteExpense(id: number): Promise<void> {
  return request(`/api/expenses/${id}`, { method: 'DELETE' })
}
