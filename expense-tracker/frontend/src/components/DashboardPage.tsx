import { useEffect, useState } from 'react'
import { getSummary } from '../api/summary'
import { formatLongDate, todayISO } from '../lib/dates'
import { formatVND } from '../lib/money'
import { currentMonth, formatMonthLabel, percentChange, shiftMonth } from '../lib/months'
import type { Expense, MonthlySummary } from '../types'
import { CategoryBreakdown } from './CategoryBreakdown'
import { ExpenseRow } from './ExpenseRow'
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, WalletIcon } from './icons'
import { ErrorState, ListSkeleton } from './States'

/** Only show the skeleton if loading takes longer than this, to avoid a flash. */
const SKELETON_DELAY_MS = 300
const RECENT_COUNT = 6

type Result = { key: string; summary: MonthlySummary | null }

type Props = {
  /** All expenses, newest first; the recent list shows the latest of the selected month. */
  expenses: Expense[]
  /** Bumps whenever expenses change, so the summary is fetched again. */
  version: number
  onAdd: () => void
  onEdit: (expense: Expense) => void
  onDelete: (expense: Expense) => void
  onViewAll: () => void
}

export function DashboardPage({ expenses, version, onAdd, onEdit, onDelete, onViewAll }: Props) {
  const [month, setMonth] = useState(() => currentMonth())
  const [retries, setRetries] = useState(0)
  const [result, setResult] = useState<Result | null>(null)
  const [slowKey, setSlowKey] = useState<string | null>(null)

  const key = `${month}:${version}:${retries}`
  const current = result?.key === key ? result : null
  const loading = current === null
  const today = todayISO()
  const isCurrent = month === currentMonth(today)

  useEffect(() => {
    let ignore = false
    // State is set only after the request settles, never synchronously here.
    getSummary(month).then(
      (summary) => !ignore && setResult({ key, summary }),
      () => !ignore && setResult({ key, summary: null }),
    )
    const timer = setTimeout(() => setSlowKey(key), SKELETON_DELAY_MS)
    return () => {
      ignore = true
      clearTimeout(timer)
    }
  }, [month, key])

  const summary = current?.summary ?? null
  const recent = expenses.filter((expense) => expense.date.startsWith(month)).slice(0, RECENT_COUNT)
  const failed = current !== null && current.summary === null

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

      {loading && slowKey === key && <ListSkeleton />}
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
      {summary && summary.count > 0 && (
        <>
          <section className="kpi-grid" aria-label="Key figures">
            <SpentCard summary={summary} month={month} isCurrent={isCurrent} />
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
            </section>
          </div>
        </>
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
