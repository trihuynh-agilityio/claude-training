import { DATE_RANGE_OPTIONS, validateRange, type DateRange, type Filters } from '../lib/filters'
import { AlertIcon } from './icons'

type Props = {
  filters: Filters
  onChange: (filters: Filters) => void
}

export function FilterCard({ filters, onChange }: Props) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch })
  const rangeError = filters.range === 'custom' ? validateRange(filters.from, filters.to) : undefined

  return (
    <section className="card filter-card" aria-label="Filters">
      <div className="filter-row">
        <div className="field filter-search">
          <label className="label" htmlFor="filter-query">
            Search
          </label>
          <div className="input">
            <input
              id="filter-query"
              type="search"
              autoComplete="off"
              placeholder="Search notes"
              value={filters.query}
              onChange={(e) => set({ query: e.target.value })}
            />
          </div>
        </div>

        <div className="field filter-range">
          <label className="label" htmlFor="filter-range">
            Date range
          </label>
          <div className="input">
            <select
              id="filter-range"
              value={filters.range}
              onChange={(e) => set({ range: e.target.value as DateRange })}
            >
              {DATE_RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {filters.range === 'custom' && (
        <div className="filter-row">
          <div className="field filter-date">
            <label className="label" htmlFor="filter-from">
              From
            </label>
            <div className={rangeError ? 'input invalid' : 'input'}>
              <input
                id="filter-from"
                type="date"
                value={filters.from}
                onChange={(e) => set({ from: e.target.value })}
                aria-invalid={rangeError ? true : undefined}
                aria-describedby={rangeError ? 'filter-range-error' : undefined}
              />
            </div>
          </div>
          <div className="field filter-date">
            <label className="label" htmlFor="filter-to">
              To
            </label>
            <div className={rangeError ? 'input invalid' : 'input'}>
              <input
                id="filter-to"
                type="date"
                value={filters.to}
                onChange={(e) => set({ to: e.target.value })}
                aria-invalid={rangeError ? true : undefined}
                aria-describedby={rangeError ? 'filter-range-error' : undefined}
              />
            </div>
          </div>
          {rangeError && (
            <p className="field-error filter-error" id="filter-range-error">
              <AlertIcon size={14} />
              {rangeError}
            </p>
          )}
        </div>
      )}
    </section>
  )
}
