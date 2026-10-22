import {
  budgetStatus,
  daysLeft,
  percentUsed,
  remaining,
  safePerDay,
  todayPercent,
} from '../lib/budgets'
import { formatMonthLabel } from '../lib/months'
import { formatVND } from '../lib/money'
import type { Budget } from '../types'
import { ProgressBar } from './ProgressBar'
import { StatusBadge } from './StatusBadge'

type Props = { budget: Budget; spent: number; isCurrent: boolean; today: string }

/** The Remaining budget and, for the current month, Safe to spend per day. */
export function BudgetCards({ budget, spent, isCurrent, today }: Props) {
  const left = remaining(budget.monthly, spent)
  const status = budgetStatus(spent, budget.monthly)
  const percent = percentUsed(spent, budget.monthly)
  const days = daysLeft(today)

  return (
    <>
      <article className="card kpi">
        <h2 className="kpi-label">{left < 0 ? 'Over budget by' : 'Remaining budget'}</h2>
        <p className="kpi-value num">{formatVND(Math.abs(left))}</p>
        <p className="kpi-badge">
          <StatusBadge status={status} />
        </p>
        <ProgressBar
          percent={percent}
          status={status}
          label="Budget used"
          todayPercent={isCurrent ? todayPercent(today) : undefined}
        />
        <p className="kpi-note">
          {percent}% of {formatVND(budget.monthly)} used
          {!budget.is_own && ` · budget from ${formatMonthLabel(budget.source_month)}`}
        </p>
      </article>
      {isCurrent && (
        <article className="card kpi">
          <h2 className="kpi-label">Safe to spend per day</h2>
          <p className="kpi-value num">{formatVND(safePerDay(left, days))}</p>
          <p className="kpi-note">
            {days === 0 ? 'Last day of the month' : `${days} ${days === 1 ? 'day' : 'days'} left`}
          </p>
        </article>
      )}
    </>
  )
}

/** Shown where a month has no budget at all. */
export function BudgetInvite({ canSet, onSet }: { canSet: boolean; onSet: () => void }) {
  return (
    <article className="card kpi budget-invite">
      <h2 className="kpi-label">Monthly budget</h2>
      <p className="kpi-invite">
        {canSet
          ? 'Set a monthly budget to see what is left and what is safe to spend each day.'
          : 'No budget was set for this month.'}
      </p>
      {canSet && (
        <button className="btn btn-primary" type="button" onClick={onSet}>
          Set a monthly budget
        </button>
      )}
    </article>
  )
}
