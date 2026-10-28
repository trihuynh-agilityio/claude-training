import { alertText, budgetAlerts } from '../lib/budgets'
import type { MonthlySummary } from '../types'

type Props = {
  summary: MonthlySummary
  onOpenBudget: () => void
}

/** Lists the budgets that are over or near their limit; renders nothing when there are none. */
export function BudgetAlertStrip({ summary, onOpenBudget }: Props) {
  const { over, near } = budgetAlerts(summary)
  if (over.length === 0 && near.length === 0) return null

  const text = alertText(
    over.map((item) => item.name),
    near.map((item) => item.name),
  )

  return (
    <div className={`alert alert-strip ${over.length > 0 ? 'is-over' : 'is-near'}`}>
      <p className="alert-strip-text">{text}</p>
      <button className="link-btn" type="button" onClick={onOpenBudget}>
        View budget
      </button>
    </div>
  )
}
