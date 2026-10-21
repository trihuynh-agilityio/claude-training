import type { MonthlySummary } from '../types'
import { request } from './client'

/**
 * Spending for one month ("YYYY-MM"), broken down by category. `today` is the browser's date,
 * so the server compares against the same day this page treats as the current one.
 */
export function getSummary(month: string, today: string): Promise<MonthlySummary> {
  return request(`/api/summary?month=${month}&today=${today}`)
}
