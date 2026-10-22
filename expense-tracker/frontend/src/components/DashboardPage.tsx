import { useEffect, useState } from 'react'
import { getSummary } from '../api/summary'
import { formatLongDate, todayISO } from '../lib/dates'
import { formatVND } from '../lib/money'
import { currentMonth, formatMonthLabel, percentChange, shiftMonth } from '../lib/months'
import type { Expense, MonthlySummary } from '../types'
import { CategoryBreakdown } from './CategoryBreakdown'
import { BudgetCards, BudgetInvite } from './BudgetCards'
import { ExpenseRow } from './ExpenseRow'
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, WalletIcon } from './icons'
import { ErrorState, ListSkeleton } from './States'
import type { LoadStatus } from './TransactionsPage'

/** Only show the skeleton if loading takes longer than this, to avoid a flash. */
const SKELETON_DELAY_MS = 300
const RECENT_COUNT = 6

/** `key` says which request produced it; `summary` is null when that request failed. */
type Result = { key: string; month: string; summary: MonthlySummary | null }

type Props = {
  /** All expenses, newest first; the recent list shows the latest of the selected month. */
  expenses: Expense[]
  /** Whether `expenses` has loaded; the recent list can't be trusted before then. */
  status: LoadStatus
  /** Bumps whenever expenses change, so the summary is fetched again. */
  version: number
  onAdd: () => void
  onEdit: (expense: Expense) => void
  onDelete: (expense: Expense) => void
  onViewAll: () => void
  onOpenBudget: () => void
  onRetry: () => void
}

export function DashboardPage({
  expenses,
  status,
  version,
  onAdd,
  onEdit,
  onDelete,
  onViewAll,
  onOpenBudget,
  onRetry,
}: Props) {
  const [month, setMonth] = useState(() => currentMonth())
  const [retries, setRetries] = useState(0)
  const [result, setResult] = useState<Result | null>(null)
  const [slowKey, setSlowKey] = useState<string | null>(null)

  const key = `${month}:${version}:${retries}`
  const today = todayISO()
  const isCurrent = month === currentMonth(today)
  // While a refetch is pending, keep showing the last result for this month instead of blanking.
  const shown = result?.month === month ? result : null
  const refreshing = result?.key !== key

  useEffect(() => {
    let ignore = false
    // State is set only after the request settles, never synchronously here.
    getSummary(month, todayISO()).then(
      (summary) => !ignore && setResult({ key, month, summary }),
      () => !ignore && setResult({ key, month, summary: null }),
    )
    const timer = setTimeout(() => setSlowKey(key), SKELETON_DELAY_MS)
    return () => {
      ignore = true
      clearTimeout(timer)
    }
  }, [month, key])

  const summary = shown?.summary ?? null
  const failed = !refreshing && shown !== null && shown.summary === null
  const recent = expenses.filter((expense) => expense.date.startsWith(month)).slice(0, RECENT_COUNT)

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">{formatLongDate(today)}</p>
        </div>
        <div className="month-switcher">
          <button
            className="icon-btn"
            type="button"
            aria-label="Previous month"
            onClick={() => setMonth(shiftMonth(month, -1))}
          >
            <ChevronLeftIcon />
          </button>
          <span className="month-label" aria-live="polite">
            {formatMonthLabel(month)}
          </span>
          <button
            className="icon-btn"
            type="button"
            aria-label="Next month"
            disabled={isCurrent}
            onClick={() => setMonth(shiftMonth(month, 1))}
          >
            <ChevronRightIcon />
          </button>
        </div>
      </header>

      {summary === null && refreshing && slowKey === key && <ListSkeleton />}
      {failed && <ErrorState onRetry={() => setRetries((count) => count + 1)} />}
      {summary && summary.count === 0 && (
        <section className="card state">
          <span className="state-icon">
            <WalletIcon />
          </span>
          <h2 className="state-title">No expenses in {formatMonthLabel(month)}</h2>
          <p className="state-text">
            {isCurrent
              ? 'Add an expense to see this month’s spending and where it goes.'
              : 'Nothing was recorded this month. Use the arrows to look at another month.'}
          </p>
          {isCurrent && (
            <button className="btn btn-primary" type="button" onClick={onAdd}>
              <PlusIcon />
              Add expense
            </button>
          )}
        </section>
      )}
      {summary && summary.count === 0 && summary.budget === null && isCurrent && (
        <section className="kpi-grid" aria-label="Budget">
          <BudgetInvite canSet onSet={onOpenBudget} />
        </section>
      )}
      {summary && summary.count > 0 && (
        <div className="dashboard" aria-busy={refreshing}>
          <section className="kpi-grid" aria-label="Key figures">
            <SpentCard summary={summary} month={month} isCurrent={isCurrent} />
            {summary.budget ? (
              <BudgetCards
                budget={summary.budget}
                spent={summary.total}
                isCurrent={isCurrent}
                today={today}
              />
            ) : (
              <BudgetInvite canSet={isCurrent} onSet={onOpenBudget} />
            )}
          </section>
          <div className="dashboard-panels">
            <CategoryBreakdown categories={summary.categories} total={summary.total} />
            <section className="card panel" aria-labelledby="recent-title">
              <div className="panel-head">
                <h2 className="panel-title" id="recent-title">
                  Recent transactions
                </h2>
                <button className="link-btn" type="button" onClick={onViewAll}>
                  View all
                </button>
              </div>
              {status === 'ready' && (
                <ul className="recent-list">
                  {recent.map((expense) => (
                    <ExpenseRow
                      key={expense.id}
                      expense={expense}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  ))}
                </ul>
              )}
              {status === 'loading' && <p className="panel-note">Loading transactions…</p>}
              {status === 'error' && (
                <p className="panel-note" role="alert">
                  Couldn’t load transactions.{' '}
                  <button className="link-btn" type="button" onClick={onRetry}>
                    Try again
                  </button>
                </p>
              )}
            </section>
          </div>
        </div>
      )}
    </>
  )
}

function SpentCard({
  summary,
  month,
  isCurrent,
}: {
  summary: MonthlySummary
  month: string
  isCurrent: boolean
}) {
  const change = percentChange(summary.total, summary.same_day_last_month_total)
  let comparison = 'No spending to compare with last month'
  if (change !== null) {
    const direction = change === 0 ? 'Same as' : `${change > 0 ? '↑' : '↓'} ${Math.abs(change)}% vs`
    comparison = `${direction} ${isCurrent ? 'same day last month' : 'the month before'}`
  }

  return (
    <article className="card kpi">
      <h2 className="kpi-label">
        {isCurrent ? 'Spent this month' : `Spent in ${formatMonthLabel(month)}`}
      </h2>
      <p className="kpi-value num">{formatVND(summary.total)}</p>
      <p className="kpi-note">
        {summary.count} {summary.count === 1 ? 'expense' : 'expenses'} · {comparison}
      </p>
    </article>
  )
}
