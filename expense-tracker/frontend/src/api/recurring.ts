import type { Recurring, RecurringInput } from '../types'
import { request } from './client'

const withToday = (today: string) => `?${new URLSearchParams({ today })}`

export function listRecurring(): Promise<Recurring[]> {
  return request('/api/recurring')
}

export function createRecurring(input: RecurringInput, today: string): Promise<Recurring> {
  return request(`/api/recurring${withToday(today)}`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateRecurring(
  id: number,
  input: RecurringInput,
  today: string,
): Promise<Recurring> {
  return request(`/api/recurring/${id}${withToday(today)}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

/** Resuming skips the occurrences that fell due while paused, relative to `today`. */
export function setRecurringPaused(id: number, paused: boolean, today: string): Promise<Recurring> {
  return request(`/api/recurring/${id}${withToday(today)}`, {
    method: 'PATCH',
    body: JSON.stringify({ paused }),
  })
}

export function deleteRecurring(id: number): Promise<void> {
  return request(`/api/recurring/${id}`, { method: 'DELETE' })
}

/** Add every due expense up to `today`; returns how many were added. */
export function generateRecurring(today: string): Promise<{ added: number }> {
  return request(`/api/recurring/generate${withToday(today)}`, { method: 'POST' })
}
