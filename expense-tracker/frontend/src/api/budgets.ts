import type { Budget, BudgetInput } from '../types'
import { request } from './client'

/** The budget in force for a month ("YYYY-MM"), or null when there is none. */
export function getBudget(month: string, today: string): Promise<Budget | null> {
  return request(`/api/budgets?month=${month}&today=${today}`)
}

/** Replace a month's budget. Only the current and next month can be saved. */
export function saveBudget(month: string, input: BudgetInput, today: string): Promise<Budget> {
  return request(`/api/budgets/${month}?today=${today}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}
