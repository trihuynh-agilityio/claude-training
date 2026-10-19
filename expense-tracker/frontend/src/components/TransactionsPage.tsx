import { useState } from 'react'
import { groupByDay } from '../lib/dates'
import { DEFAULT_FILTERS, filterExpenses, type Filters } from '../lib/filters'
import { formatVND } from '../lib/money'
import type { Expense } from '../types'
import { ExpenseRow } from './ExpenseRow'
import { FilterCard } from './FilterCard'
import { PlusIcon } from './icons'
import { EmptyState, ErrorState, ListSkeleton, NoMatchState } from './States'

export type LoadStatus = 'loading' | 'ready' | 'error'

type Props = {
  expenses: Expense[]
  status: LoadStatus
  showSkeleton: boolean
  onAdd: () => void
  onEdit: (expense: Expense) => void
  onDelete: (expense: Expense) => void
  onRetry: () => void
}

export function TransactionsPage({ expenses, status, showSkeleton, onAdd, onEdit, onDelete, onRetry }: Props) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const visible = filterExpenses(expenses, filters)
  const total = visible.reduce((sum, expense) => sum + expense.amount, 0)
  const count = `${visible.length} ${visible.length === 1 ? 'expense' : 'expenses'}`

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">Transactions</h1>
          {status === 'ready' && (
            <p className="page-subtitle num">
              {count} · {formatVND(total)}
            </p>
          )}
        </div>
        <button className="btn btn-primary" type="button" onClick={onAdd}>
          <PlusIcon />
          Add expense
        </button>
      </header>

      {status === 'ready' && expenses.length > 0 && <FilterCard filters={filters} onChange={setFilters} />}

      {status === 'loading' && showSkeleton && <ListSkeleton />}
      {status === 'error' && <ErrorState onRetry={onRetry} />}
      {status === 'ready' && expenses.length === 0 && <EmptyState onAdd={onAdd} />}
      {status === 'ready' && expenses.length > 0 && visible.length === 0 && (
        <NoMatchState onClear={() => setFilters(DEFAULT_FILTERS)} />
      )}
      {status === 'ready' && visible.length > 0 && (
        <section className="card expense-list" aria-label="Expenses">
          {groupByDay(visible).map((group) => (
            <div className="day-group" key={group.date}>
              <h2 className="day-header">
                <span>{group.label}</span>
                <span className="num">{formatVND(group.total)}</span>
              </h2>
              <ul>
                {group.items.map((expense) => (
                  <ExpenseRow key={expense.id} expense={expense} onEdit={onEdit} onDelete={onDelete} />
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}
    </>
  )
}
