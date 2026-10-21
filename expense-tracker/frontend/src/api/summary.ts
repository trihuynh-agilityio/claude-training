import type { MonthlySummary } from '../types'
import { request } from './client'

/** Spending for one month ("YYYY-MM"), broken down by category. */
export function getSummary(month: string): Promise<MonthlySummary> {
  return request(`/api/summary?month=${month}`)
}
