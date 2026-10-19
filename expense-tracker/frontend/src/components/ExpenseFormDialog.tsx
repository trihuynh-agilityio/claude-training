import { useRef, useState, type FormEvent } from 'react'
import { addDays, todayISO } from '../lib/dates'
import { digitsOnly, groupDigits } from '../lib/money'
import {
  MAX_NOTE_LENGTH,
  toExpenseInput,
  validateExpense,
  type ExpenseDraft,
  type ExpenseField,
} from '../lib/validation'
import type { Expense, ExpenseInput } from '../types'
import { AlertIcon, CloseIcon, TrashIcon } from './icons'
import { useModalDialog } from './useModalDialog'

const QUICK_AMOUNTS = [50_000, 100_000, 200_000, 500_000]
const FIELD_ORDER: ExpenseField[] = ['amount', 'date', 'note']

type Props = {
  /** The expense being edited; omit to add a new one. */
  expense?: Expense
  onSave: (input: ExpenseInput) => Promise<void>
  onClose: () => void
  onRequestDelete?: (expense: Expense) => void
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p className="field-error" id={id}>
      <AlertIcon size={14} />
      {message}
    </p>
  )
}

export function ExpenseFormDialog({ expense, onSave, onClose, onRequestDelete }: Props) {
  const today = todayISO()
  const [draft, setDraft] = useState<ExpenseDraft>({
    amount: expense ? String(expense.amount) : '',
    date: expense?.date ?? today,
    note: expense?.note ?? '',
  })
  const [submitCount, setSubmitCount] = useState(0)
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const amountRef = useRef<HTMLInputElement>(null)
  const dateRef = useRef<HTMLInputElement>(null)
  const noteRef = useRef<HTMLInputElement>(null)
  const dialogRef = useModalDialog(amountRef)

  // Errors show only after the first submit, then update live as fields change.
  const errors = submitCount > 0 ? validateExpense(draft, today) : {}
  const errorCount = Object.keys(errors).length

  const set = (field: ExpenseField, value: string) => setDraft((d) => ({ ...d, [field]: value }))

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setServerError(null)
    setSubmitCount((n) => n + 1)
    const current = validateExpense(draft, today)
    const firstInvalid = FIELD_ORDER.find((field) => current[field])
    if (firstInvalid) {
      const refs = { amount: amountRef, date: dateRef, note: noteRef }
      refs[firstInvalid].current?.focus()
      return
    }

    setSaving(true)
    try {
      await onSave(toExpenseInput(draft))
    } catch {
      setServerError('Couldn’t save this expense. Check your connection and try again.')
      setSaving(false)
    }
  }

  const isEdit = expense !== undefined

  return (
    <dialog
      ref={dialogRef}
      className="dialog dialog-form"
      aria-labelledby="expense-form-title"
      onCancel={(event) => {
        // Esc: let React unmount the dialog instead of the browser closing it.
        event.preventDefault()
        onClose()
      }}
    >
      <form noValidate onSubmit={handleSubmit}>
        <div className="dialog-header">
          <h2 className="dialog-title" id="expense-form-title">
            {isEdit ? 'Edit expense' : 'Add expense'}
          </h2>
          <button className="icon-btn" type="button" aria-label="Close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <div className="form-body">
          {errorCount > 0 && (
            <div className="alert" role="alert">
              <AlertIcon />
              <span>
                Fix {errorCount} {errorCount === 1 ? 'field' : 'fields'} to save this expense.
              </span>
            </div>
          )}
          {serverError && (
            <div className="alert" role="alert">
              <AlertIcon />
              <span>{serverError}</span>
            </div>
          )}

          <div className="field">
            <label className="label" htmlFor="amount">
              Amount
            </label>
            <div className={errors.amount ? 'input input-money invalid' : 'input input-money'}>
              <input
                ref={amountRef}
                id="amount"
                inputMode="numeric"
                autoComplete="off"
                placeholder="0"
                value={groupDigits(draft.amount)}
                onChange={(e) => set('amount', digitsOnly(e.target.value))}
                aria-invalid={errors.amount ? true : undefined}
                aria-describedby={errors.amount ? 'amount-error' : undefined}
              />
              <span className="currency" aria-hidden="true">
                ₫
              </span>
            </div>
            <FieldError id="amount-error" message={errors.amount} />
            <div className="pills" role="group" aria-label="Quick amounts">
              {QUICK_AMOUNTS.map((value) => (
                <button className="pill" type="button" key={value} onClick={() => set('amount', String(value))}>
                  {groupDigits(String(value))}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label className="label" htmlFor="date">
              Date
            </label>
            <div className="date-row">
              <div className={errors.date ? 'input invalid' : 'input'}>
                <input
                  ref={dateRef}
                  id="date"
                  type="date"
                  max={today}
                  value={draft.date}
                  onChange={(e) => set('date', e.target.value)}
                  aria-invalid={errors.date ? true : undefined}
                  aria-describedby={errors.date ? 'date-error' : undefined}
                />
              </div>
              <button className="pill" type="button" onClick={() => set('date', today)}>
                Today
              </button>
              <button className="pill" type="button" onClick={() => set('date', addDays(today, -1))}>
                Yesterday
              </button>
            </div>
            <FieldError id="date-error" message={errors.date} />
          </div>

          <div className="field">
            <div className="label-row">
              <label className="label" htmlFor="note">
                Note <span className="label-optional">(optional)</span>
              </label>
              <span className="hint num" aria-live="polite">
                {draft.note.length}/{MAX_NOTE_LENGTH}
              </span>
            </div>
            <div className={errors.note ? 'input invalid' : 'input'}>
              <input
                ref={noteRef}
                id="note"
                maxLength={MAX_NOTE_LENGTH}
                placeholder="e.g. Lunch with the team"
                value={draft.note}
                onChange={(e) => set('note', e.target.value)}
                aria-invalid={errors.note ? true : undefined}
                aria-describedby={errors.note ? 'note-error' : undefined}
              />
            </div>
            <FieldError id="note-error" message={errors.note} />
          </div>
        </div>

        <div className="dialog-footer">
          {isEdit && onRequestDelete && (
            <button className="btn btn-ghost-danger" type="button" onClick={() => onRequestDelete(expense)}>
              <TrashIcon />
              Delete
            </button>
          )}
          <span className="spacer" />
          <button className="btn btn-secondary" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add expense'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
