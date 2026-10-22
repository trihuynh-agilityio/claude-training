import type { BudgetStatus } from '../lib/budgets'

type Props = {
  /** Percent used; the fill is capped at 100% but the value is not. */
  percent: number
  status: BudgetStatus
  label: string
  /** Where today falls in the month, 0 to 100; omit for months other than the current one. */
  todayPercent?: number
  size?: 'small' | 'large'
}

export function ProgressBar({ percent, status, label, todayPercent, size = 'large' }: Props) {
  return (
    <div
      className={`progress ${size} ${status}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      <span className="progress-fill" style={{ width: `${Math.min(percent, 100)}%` }} />
      {todayPercent !== undefined && (
        <span className="progress-today" style={{ left: `${todayPercent}%` }} />
      )}
    </div>
  )
}
