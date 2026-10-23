import { useCallback, useEffect, useState } from 'react'
import {
  createRecurring,
  deleteRecurring,
  generateRecurring,
  listRecurring,
  setRecurringPaused,
  updateRecurring,
} from '../api/recurring'
import { getCategory } from '../lib/categories'
import { formatShortDate, todayISO } from '../lib/dates'
import { formatVND } from '../lib/money'
import { dayLabel, ruleStatus } from '../lib/recurring'
import type { Recurring, RecurringInput } from '../types'
import { CategoryTile } from './CategoryTile'
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog'
import {
  PauseIcon,
  PencilIcon,
  PlayIcon,
  PlusIcon,
  RepeatIcon,
  TrashIcon,
  WarningIcon,
} from './icons'
import { RecurringFormDialog } from './RecurringFormDialog'

type Props = {
  /** Called after a change that can add or detach expenses, so the list and Dashboard reload. */
  onChanged: () => void
  onToast: (message: string) => void
}

type FormState = { mode: 'add' } | { mode: 'edit'; rule: Recurring }
type Status = 'loading' | 'ready' | 'error'

function dueText(rule: Recurring): string {
  const status = ruleStatus(rule)
  if (status.kind === 'paused') return 'Paused'
  if (status.kind === 'ended') return 'Ended'
  return `Next: ${formatShortDate(status.date)}`
}

export function RecurringPage({ onChanged, onToast }: Props) {
  const [rules, setRules] = useState<Recurring[]>([])
  const [status, setStatus] = useState<Status>('loading')
  const [form, setForm] = useState<FormState | null>(null)
  const [deleting, setDeleting] = useState<Recurring | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const load = useCallback(
    () =>
      listRecurring().then(
        (data) => {
          setRules(data)
          setStatus('ready')
        },
        () => setStatus('error'),
      ),
    [],
  )

  useEffect(() => {
    void load()
  }, [load])

  // Errors propagate to the form, which keeps the dialog open and shows them.
  async function save(input: RecurringInput) {
    const today = todayISO()
    if (form?.mode === 'edit') {
      await updateRecurring(form.rule.id, input, today)
      onToast('Changes saved')
    } else {
      await createRecurring(input, today)
      onToast('Recurring expense added')
    }
    setForm(null)
    // Catch up now, so a rule that starts in the past shows its expenses right away.
    await generateRecurring(today).catch(() => undefined)
    onChanged()
    await load()
  }

  async function togglePause(rule: Recurring) {
    try {
      await setRecurringPaused(rule.id, !rule.paused, todayISO())
      onToast(rule.paused ? 'Resumed' : 'Paused')
      await load()
    } catch {
      onToast('Couldn’t update this recurring expense. Try again.')
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      await deleteRecurring(deleting.id)
      setDeleting(null)
      onToast('Recurring expense deleted')
      onChanged()
      await load()
    } catch {
      setDeleteError('Couldn’t delete this recurring expense. Try again.')
    } finally {
      setDeleteBusy(false)
    }
  }

  const openAdd = () => setForm({ mode: 'add' })

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">Recurring</h1>
          <p className="page-subtitle">Expenses added for you once a month.</p>
        </div>
        <button className="btn btn-primary" type="button" onClick={openAdd}>
          <PlusIcon />
          Add recurring expense
        </button>
      </header>

      {status === 'error' && (
        <section className="card state" role="alert">
          <span className="state-icon error">
            <WarningIcon />
          </span>
          <h2 className="state-title">Couldn’t load your recurring expenses</h2>
          <p className="state-text">Check that the API is running and try again.</p>
          <button className="btn btn-secondary" type="button" onClick={() => void load()}>
            Try again
          </button>
        </section>
      )}

      {status === 'ready' && rules.length === 0 && (
        <section className="card state">
          <span className="state-icon">
            <RepeatIcon size={28} />
          </span>
          <h2 className="state-title">No recurring expenses yet</h2>
          <p className="state-text">Add rent, subscriptions and other monthly costs once.</p>
          <button className="btn btn-primary" type="button" onClick={openAdd}>
            <PlusIcon />
            Add recurring expense
          </button>
        </section>
      )}

      {status === 'ready' && rules.length > 0 && (
        <section className="card expense-list" aria-label="Recurring expenses">
          <ul>
            {rules.map((rule) => {
              const name = rule.note ?? `recurring expense of ${formatVND(rule.amount)}`
              return (
                <li className="expense-row recurring-row" key={rule.id}>
                  <CategoryTile categoryId={rule.category_id} />
                  <span className="expense-text">
                    <span className={rule.note ? 'expense-note' : 'expense-note empty'}>
                      {rule.note ?? 'No note'}
                    </span>
                    <span className="expense-category">
                      {getCategory(rule.category_id).name} · {dayLabel(rule.day)}
                    </span>
                    <span className="recurring-due">{dueText(rule)}</span>
                  </span>
                  <span className="expense-amount num">{formatVND(rule.amount)}</span>
                  <span className="row-actions">
                    <button
                      className="icon-btn"
                      type="button"
                      aria-label={`Edit ${name}`}
                      onClick={() => setForm({ mode: 'edit', rule })}
                    >
                      <PencilIcon />
                    </button>
                    <button
                      className="icon-btn"
                      type="button"
                      aria-label={`${rule.paused ? 'Resume' : 'Pause'} ${name}`}
                      onClick={() => void togglePause(rule)}
                    >
                      {rule.paused ? <PlayIcon /> : <PauseIcon />}
                    </button>
                    <button
                      className="icon-btn danger"
                      type="button"
                      aria-label={`Delete ${name}`}
                      onClick={() => {
                        setDeleteError(null)
                        setDeleting(rule)
                      }}
                    >
                      <TrashIcon />
                    </button>
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {form && (
        <RecurringFormDialog
          key={form.mode === 'edit' ? form.rule.id : 'new'}
          rule={form.mode === 'edit' ? form.rule : undefined}
          onSave={save}
          onClose={() => setForm(null)}
        />
      )}

      {deleting && (
        <ConfirmDeleteDialog
          expense={{ ...deleting, meta: dayLabel(deleting.day) }}
          title="Delete this recurring expense?"
          description="Expenses it already added are kept. This can’t be undone."
          confirmLabel="Delete recurring expense"
          busy={deleteBusy}
          error={deleteError}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  )
}
