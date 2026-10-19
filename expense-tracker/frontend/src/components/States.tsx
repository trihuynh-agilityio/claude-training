import { PlusIcon, WalletIcon, WarningIcon } from './icons'

export function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <section className="card state">
      <span className="state-icon">
        <WalletIcon />
      </span>
      <h2 className="state-title">Start tracking your spending</h2>
      <p className="state-text">Add your first expense to see where your money goes. Expenses are grouped by day.</p>
      <button className="btn btn-primary" type="button" onClick={onAdd}>
        <PlusIcon />
        Add first expense
      </button>
    </section>
  )
}

export function NoMatchState({ onClear }: { onClear: () => void }) {
  return (
    <section className="card state">
      <span className="state-icon">
        <WalletIcon />
      </span>
      <h2 className="state-title">No expenses match</h2>
      <p className="state-text">Try a different search or date range, or clear the filters to see everything.</p>
      <button className="btn btn-secondary" type="button" onClick={onClear}>
        Clear filters
      </button>
    </section>
  )
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <section className="card state" role="alert">
      <span className="state-icon error">
        <WarningIcon />
      </span>
      <h2 className="state-title">Couldn’t load your expenses</h2>
      <p className="state-text">Check that the API is running and try again. Nothing you saved was lost.</p>
      <button className="btn btn-secondary" type="button" onClick={onRetry}>
        Try again
      </button>
    </section>
  )
}

export function ListSkeleton() {
  return (
    <section className="card expense-list" aria-busy="true" aria-label="Loading expenses">
      {[60, 72, 48].map((width) => (
        <div className="skeleton-row" key={width}>
          <span className="skeleton" style={{ width: 40, height: 40, borderRadius: 12 }} />
          <span className="skeleton" style={{ height: 12, width: `${width}%` }} />
          <span className="skeleton" style={{ height: 12, width: 80, marginLeft: 'auto' }} />
        </div>
      ))}
    </section>
  )
}
