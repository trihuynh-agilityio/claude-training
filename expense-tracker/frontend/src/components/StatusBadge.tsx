import { STATUS_LABELS, type BudgetStatus } from '../lib/budgets'

/** The status as a pill with text, so it never relies on color alone. */
export function StatusBadge({ status }: { status: BudgetStatus }) {
  return <span className={`status-badge ${status}`}>{STATUS_LABELS[status]}</span>
}
