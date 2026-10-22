import { useEffect, useState, type FormEvent } from 'react'
import { saveBudget } from '../api/budgets'
import { ApiError } from '../api/client'
import { getSummary } from '../api/summary'
import {
  STATUS_LABELS,
  budgetStatus,
  daysLeft,
  percentUsed,
  remaining,
  safePerDay,
  sortByStatus,
  todayPercent,
  type BudgetStatus,
} from '../lib/budgets'
import { CATEGORIES, getCategory, type CategoryId } from '../lib/categories'
import { todayISO } from '../lib/dates'
import { formatVND } from '../lib/money'
import { currentMonth, formatMonthLabel, shiftMonth } from '../lib/months'
import { toBudgetInput, validateBudget, type BudgetDraft } from '../lib/validation'
import type { Budget, MonthlySummary } from '../types'
import { BudgetInvite } from './BudgetCards'
import { CategoryTile } from './CategoryTile'
import { AlertIcon, ChevronLeftIcon, ChevronRightIcon } from './icons'
import { MoneyInput } from './MoneyInput'
import { ProgressBar } from './ProgressBar'
import { ErrorState, ListSkeleton } from './States'
import { StatusBadge } from './StatusBadge'

/** Only show the skeleton if loading takes longer than this, to avoid a flash. */
const SKELETON_DELAY_MS = 300

type Result = { key: string; month: string; summary: MonthlySummary | null }

type Props = {
  /** Bumps whenever expenses change, so the spent amounts are fetched again. */
  version: number
  onSaved: (message: string) => void
}

function toDraft(budget: Budget | null): BudgetDraft {
  const categories: BudgetDraft['categories'] = {}
  for (const [id, amount] of Object.entries(budget?.categories ?? {}))
    categories[id as CategoryId] = String(amount)
  return { monthly: budget ? String(budget.monthly) : '', categories }
}

export function BudgetPage({ version, onSaved }: Props) {
  const [month, setMonth] = useState(() => currentMonth())
  const [retries, setRetries] = useState(0)
  const [result, setResult] = useState<Result | null>(null)
  const [slowKey, setSlowKey] = useState<string | null>(null)
  const [draft, setDraft] = useState<BudgetDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const key = `${month}:${version}:${retries}`
  const today = todayISO()
  const thisMonth = currentMonth(today)
  const isCurrent = month === thisMonth
  // Only this month and next can be changed; earlier months are read only.
  const editable = month >= thisMonth
  const shown = result?.month === month ? result : null
  const refreshing = result?.key !== key

  useEffect(() => {
    let ignore = false
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
  const budget = summary?.budget ?? null

  function changeMonth(next: string) {
    setMonth(next)
    setDraft(null)
    setSaveError(null)
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault()
    if (!draft || Object.keys(validateBudget(draft)).length > 0) return
    setSaving(true)
    setSaveError(null)
    try {
      await saveBudget(month, toBudgetInput(draft), todayISO())
      setDraft(null)
      setRetries((count) => count + 1)
      onSaved('Budget saved')
    } catch (error) {
      setSaveError(
        error instanceof ApiError && error.status === 422
          ? error.message
          : 'Couldn’t save this budget. Check your connection and try again.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">Budget</h1>
          <p className="page-subtitle">Plan what you spend each month</p>
        </div>
        <div className="budget-header-actions">
          <div className="month-switcher">
            <button
              className="icon-btn"
              type="button"
              aria-label="Previous month"
              disabled={saving}
              onClick={() => changeMonth(shiftMonth(month, -1))}
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
              disabled={saving || month >= shiftMonth(thisMonth, 1)}
              onClick={() => changeMonth(shiftMonth(month, 1))}
            >
              <ChevronRightIcon />
            </button>
          </div>
          {editable && summary && !draft && budget && (
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => setDraft(toDraft(budget))}
            >
              Edit budgets
            </button>
          )}
        </div>
      </header>

      {summary === null && refreshing && slowKey === key && <ListSkeleton />}
      {failed && <ErrorState onRetry={() => setRetries((count) => count + 1)} />}

      {summary && draft && (
        <BudgetForm
          draft={draft}
          month={month}
          saving={saving}
          error={saveError}
          onChange={setDraft}
          onCancel={() => {
            setDraft(null)
            setSaveError(null)
          }}
          onSubmit={handleSave}
        />
      )}

      {summary && !draft && !budget && (
        <section className="kpi-grid" aria-label="Budget">
          <BudgetInvite canSet={editable} onSet={() => setDraft(toDraft(null))} />
        </section>
      )}

      {summary && !draft && budget && (
        <div className="budget-page" aria-busy={refreshing}>
          <Overview
            budget={budget}
            summary={summary}
            isCurrent={isCurrent}
            editable={editable}
            today={today}
          />
          <CategoryList budget={budget} summary={summary} />
        </div>
      )}
    </>
  )
}

function Overview({
  budget,
  summary,
  isCurrent,
  editable,
  today,
}: {
  budget: Budget
  summary: MonthlySummary
  isCurrent: boolean
  editable: boolean
  today: string
}) {
  const spent = summary.total
  const left = remaining(budget.monthly, spent)
  const status = budgetStatus(spent, budget.monthly)
  const percent = percentUsed(spent, budget.monthly)
  const allocated = Object.values(budget.categories).reduce((sum, amount) => sum + amount, 0)

  return (
    <section className="card budget-overview" aria-labelledby="overview-title">
      <div className="budget-overview-head">
        <div>
          <h2 className="kpi-label" id="overview-title">
            Monthly budget
          </h2>
          <p className="kpi-value num">{formatVND(budget.monthly)}</p>
        </div>
        <StatusBadge status={status} />
      </div>
      <ProgressBar
        percent={percent}
        status={status}
        label="Budget used"
        todayPercent={isCurrent ? todayPercent(today) : undefined}
      />
      <dl className="budget-stats">
        <div>
          <dt>Spent</dt>
          <dd className="num">
            {formatVND(spent)} <span className="stat-note">· {percent}%</span>
          </dd>
        </div>
        <div>
          <dt>{left < 0 ? 'Over budget by' : 'Remaining'}</dt>
          <dd className="num">
            {formatVND(Math.abs(left))}
            {isCurrent && (
              <span className="stat-note">
                {' '}
                · ≈ {formatVND(safePerDay(left, daysLeft(today)))}/day
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt>Allocated to categories</dt>
          <dd className="num">
            {formatVND(allocated)}{' '}
            <span className="stat-note">· {formatVND(budget.monthly - allocated)} unallocated</span>
          </dd>
        </div>
      </dl>
      {!budget.is_own && (
        <p className="budget-source">
          Using the budget from {formatMonthLabel(budget.source_month)}.
          {editable && ' Edit budgets and save to give this month its own.'}
        </p>
      )}
    </section>
  )
}

function CategoryList({ budget, summary }: { budget: Budget; summary: MonthlySummary }) {
  const spentBy = new Map(summary.categories.map((item) => [item.category_id, item.total]))
  const rows = sortByStatus(
    (Object.entries(budget.categories) as [CategoryId, number][]).map(([id, amount]) => ({
      id,
      budget: amount,
      spent: spentBy.get(id) ?? 0,
    })),
  )
  const counts: Record<BudgetStatus, number> = { 'on-track': 0, 'near-limit': 0, 'over-budget': 0 }
  for (const row of rows) counts[budgetStatus(row.spent, row.budget)]++

  return (
    <section className="card panel" aria-labelledby="category-budgets-title">
      <div className="panel-head">
        <h2 className="panel-title" id="category-budgets-title">
          Category budgets
        </h2>
        <div className="status-counts">
          {(['over-budget', 'near-limit'] as const).map(
            (status) =>
              counts[status] > 0 && (
                <span key={status} className={`status-badge ${status}`}>
                  {counts[status]} {STATUS_LABELS[status]}
                </span>
              ),
          )}
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="panel-note">No category budgets. Edit budgets to add some.</p>
      ) : (
        <ul className="breakdown-list">
          {rows.map((row) => {
            const status = budgetStatus(row.spent, row.budget)
            const percent = percentUsed(row.spent, row.budget)
            const left = remaining(row.budget, row.spent)
            const name = getCategory(row.id).name
            return (
              <li className="budget-row" key={row.id}>
                <CategoryTile categoryId={row.id} size={36} />
                <span className="budget-row-main">
                  <span className="budget-row-line">
                    <span className="budget-row-name">{name}</span>
                    <StatusBadge status={status} />
                  </span>
                  <ProgressBar
                    size="small"
                    percent={percent}
                    status={status}
                    label={`${name} budget used`}
                  />
                  <span className="budget-row-line num">
                    {formatVND(row.spent)} of {formatVND(row.budget)} · {percent}%
                  </span>
                </span>
                <span className={`budget-left num ${status}`}>
                  {left < 0 ? `${formatVND(-left)} over` : `${formatVND(left)} left`}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function BudgetForm({
  draft,
  month,
  saving,
  error,
  onChange,
  onCancel,
  onSubmit,
}: {
  draft: BudgetDraft
  month: string
  saving: boolean
  error: string | null
  onChange: (draft: BudgetDraft) => void
  onCancel: () => void
  onSubmit: (event: FormEvent) => void
}) {
  // Checked live, because Save is disabled until every field is valid.
  const errors = validateBudget(draft)
  const invalid = Object.keys(errors).length > 0
  const monthly = Number(draft.monthly)
  const allocated = CATEGORIES.reduce((sum, { id }) => sum + Number(draft.categories[id] ?? 0), 0)

  return (
    <form className="card budget-overview budget-form" noValidate onSubmit={onSubmit}>
      <h2 className="panel-title">Edit budgets for {formatMonthLabel(month)}</h2>
      {error && (
        <div className="alert" role="alert">
          <AlertIcon />
          <span>{error}</span>
        </div>
      )}

      <div className="field">
        <label className="label" htmlFor="monthly-budget">
          Monthly budget
        </label>
        <MoneyInput
          large
          id="monthly-budget"
          label="Monthly budget"
          value={draft.monthly}
          onChange={(digits) => onChange({ ...draft, monthly: digits })}
          invalid={Boolean(errors.monthly)}
          describedBy={errors.monthly ? 'monthly-budget-error' : undefined}
        />
        {errors.monthly && (
          <p className="field-error" id="monthly-budget-error">
            <AlertIcon size={14} />
            {errors.monthly}
          </p>
        )}
      </div>

      <div>
        <h3 className="label">
          Category budgets <span className="label-optional">(optional)</span>
        </h3>
        {CATEGORIES.map(({ id, name }) => {
          const message = errors.categories?.[id]
          return (
            <div className="budget-edit-row" key={id}>
              <CategoryTile categoryId={id} size={36} />
              <label className="budget-row-name" htmlFor={`budget-${id}`}>
                {name}
              </label>
              <MoneyInput
                id={`budget-${id}`}
                label={`${name} budget`}
                value={draft.categories[id] ?? ''}
                onChange={(digits) =>
                  onChange({ ...draft, categories: { ...draft.categories, [id]: digits } })
                }
                invalid={Boolean(message)}
                describedBy={message ? `budget-${id}-error` : undefined}
              />
              {message && (
                <p className="field-error budget-edit-error" id={`budget-${id}-error`}>
                  <AlertIcon size={14} />
                  {message}
                </p>
              )}
            </div>
          )
        })}
        <p className="budget-total num">
          <span>Allocated to categories</span>
          <span>
            {formatVND(allocated)} of {formatVND(Number.isFinite(monthly) ? monthly : 0)}
          </span>
        </p>
        {errors.total && (
          <p className="field-error" role="alert">
            <AlertIcon size={14} />
            {errors.total}
          </p>
        )}
      </div>

      <div className="budget-actions">
        <button className="btn btn-secondary" type="button" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn btn-primary" type="submit" disabled={invalid || saving}>
          {saving ? 'Saving…' : 'Save budget'}
        </button>
      </div>
    </form>
  )
}
