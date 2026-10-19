import type { Expense, ExpenseInput } from '../types'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!response.ok) {
    // FastAPI sends {"detail": "..."} for 404s and {"detail": [...]} for 422s.
    const body = await response.json().catch(() => null)
    const message = typeof body?.detail === 'string' ? body.detail : `Request failed (${response.status})`
    throw new ApiError(response.status, message)
  }
  return (response.status === 204 ? undefined : await response.json()) as T
}

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
