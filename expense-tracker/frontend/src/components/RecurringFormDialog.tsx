import { useRef, useState, type FormEvent } from 'react'
import { ApiError } from '../api/client'
import { todayISO } from '../lib/dates'
import { digitsOnly, groupDigits } from '../lib/money'
import { countDue } from '../lib/recurring'
import {
  MAX_NOTE_LENGTH,
  toRecurringInput,
  validateRecurring,
  type RecurringDraft,
  type RecurringField,
} from '../lib/validation'
import type { Recurring, RecurringInput } from '../types'
import { CategoryPicker } from './CategoryPicker'
import { AlertIcon, CloseIcon } from './icons'
import { useModalDialog } from './useModalDialog'

const FIELD_ORDER: RecurringField[] = ['amount', 'category', 'day', 'startDate', 'endDate', 'note']

type Props = {
  /** The rule being edited; omit to add a new one. */
  rule?: Recurring
  onSave: (input: RecurringInput) => Promise<void>
  onClose: () => void
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

export function RecurringFormDialog({ rule, onSave, onClose }: Props) {
  const today = todayISO()
  const [draft, setDraft] = useState<RecurringDraft>({
    amount: rule ? String(rule.amount) : '',
    category: rule?.category_id ?? '',
    note: rule?.note ?? '',
    day: rule ? String(rule.day) : '',
    startDate: rule?.start_date ?? today,
    endDate: rule?.end_date ?? '',
  })
  const [submitCount, setSubmitCount] = useState(0)
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const amountRef = useRef<HTMLInputElement>(null)
  const categoryRef = useRef<HTMLButtonElement>(null)
  const dayRef = useRef<HTMLInputElement>(null)
  const startRef = useRef<HTMLInputElement>(null)
  const endRef = useRef<HTMLInputElement>(null)
  const noteRef = useRef<HTMLInputElement>(null)
  const dialogRef = useModalDialog(amountRef)

  const isEdit = rule !== undefined
  // The start date can't change once the rule has added an expense (the API refuses it).
  const startLocked = rule?.last_generated != null

  // Errors show only after the first submit, then update live as fields change.
  const errors = submitCount > 0 ? validateRecurring(draft, today, !startLocked) : {}
  const errorCount = Object.keys(errors).length

  const set = (field: RecurringField, value: string) => setDraft((d) => ({ ...d, [field]: value }))

  // How many expenses saving would add right now: shown for a past start date on a new rule.
  const day = Number(draft.day)
  const pastCount =
    !isEdit && day >= 1 && day <= 31 && draft.startDate !== '' && draft.startDate < today
      ? countDue(day, draft.startDate, draft.endDate || null, today)
      : 0

  const startHint = startLocked
    ? 'Can’t change after the first expense is added.'
    : pastCount > 0
      ? `This adds ${pastCount} ${pastCount === 1 ? 'expense' : 'expenses'} up to today.`
      : null

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setServerError(null)
    setSubmitCount((n) => n + 1)
    const current = validateRecurring(draft, today, !startLocked)
    const firstInvalid = FIELD_ORDER.find((field) => current[field])
    if (firstInvalid) {
      const refs = {
        amount: amountRef,
        category: categoryRef,
        day: dayRef,
        startDate: startRef,
        endDate: endRef,
        note: noteRef,
      }
      refs[firstInvalid].current?.focus()
      return
    }

    setSaving(true)
    try {
      await onSave(toRecurringInput(draft))
    } catch (error) {
      setServerError(
        error instanceof ApiError && error.status === 422
          ? error.message
          : 'Couldn’t save this recurring expense. Check your connection and try again.',
      )
      setSaving(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="dialog dialog-form"
      aria-labelledby="recurring-form-title"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <form noValidate onSubmit={handleSubmit}>
        <div className="dialog-header">
          <h2 className="dialog-title" id="recurring-form-title">
            {isEdit ? 'Edit recurring expense' : 'Add recurring expense'}
          </h2>
          <button className="icon-btn" type="button" aria-label="Close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <div className="form-body">
          {isEdit && <p className="hint">Changes apply to future months only.</p>}
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
            <label className="label" htmlFor="r-amount">
              Amount
            </label>
            <div className={errors.amount ? 'input input-money invalid' : 'input input-money'}>
              <input
                ref={amountRef}
                id="r-amount"
                inputMode="numeric"
                autoComplete="off"
                placeholder="0"
                value={groupDigits(draft.amount)}
                onChange={(e) => set('amount', digitsOnly(e.target.value))}
                aria-invalid={errors.amount ? true : undefined}
                aria-describedby={errors.amount ? 'r-amount-error' : undefined}
              />
              <span className="currency" aria-hidden="true">
                ₫
              </span>
            </div>
            <FieldError id="r-amount-error" message={errors.amount} />
          </div>

          <div className="field">
            <span className="label" id="r-category-label">
              Category
            </span>
            <CategoryPicker
              value={draft.category}
              onChange={(id) => set('category', id)}
              labelId="r-category-label"
              errorId="r-category-error"
              invalid={Boolean(errors.category)}
              focusRef={categoryRef}
            />
            <FieldError id="r-category-error" message={errors.category} />
          </div>

          <div className="field">
            <label className="label" htmlFor="r-day">
              Day of month
            </label>
            <div className={errors.day ? 'input invalid' : 'input'}>
              <input
                ref={dayRef}
                id="r-day"
                inputMode="numeric"
                autoComplete="off"
                placeholder="1 to 31"
                maxLength={2}
                value={draft.day}
                onChange={(e) => set('day', digitsOnly(e.target.value))}
                aria-invalid={errors.day ? true : undefined}
                aria-describedby={errors.day ? 'r-day-error' : 'r-day-hint'}
              />
            </div>
            {errors.day ? (
              <FieldError id="r-day-error" message={errors.day} />
            ) : (
              <p className="hint" id="r-day-hint">
                In shorter months this falls on the last day.
              </p>
            )}
          </div>

          <div className="field">
            <label className="label" htmlFor="r-start">
              Start date
            </label>
            <div className={errors.startDate ? 'input invalid' : 'input'}>
              <input
                ref={startRef}
                id="r-start"
                type="date"
                disabled={startLocked}
                value={draft.startDate}
                onChange={(e) => set('startDate', e.target.value)}
                aria-invalid={errors.startDate ? true : undefined}
                aria-describedby={
                  errors.startDate ? 'r-start-error' : startHint ? 'r-start-hint' : undefined
                }
              />
            </div>
            <FieldError id="r-start-error" message={errors.startDate} />
            {startHint && !errors.startDate && (
              <p className="hint" id="r-start-hint">
                {startHint}
              </p>
            )}
          </div>

          <div className="field">
            <label className="label" htmlFor="r-end">
              End date <span className="label-optional">(optional)</span>
            </label>
            <div className={errors.endDate ? 'input invalid' : 'input'}>
              <input
                ref={endRef}
                id="r-end"
                type="date"
                value={draft.endDate}
                onChange={(e) => set('endDate', e.target.value)}
                aria-invalid={errors.endDate ? true : undefined}
                aria-describedby={errors.endDate ? 'r-end-error' : undefined}
              />
            </div>
            <FieldError id="r-end-error" message={errors.endDate} />
          </div>

          <div className="field">
            <div className="label-row">
              <label className="label" htmlFor="r-note">
                Note <span className="label-optional">(optional)</span>
              </label>
              <span className="hint num" aria-live="polite">
                {draft.note.length}/{MAX_NOTE_LENGTH}
              </span>
            </div>
            <div className={errors.note ? 'input invalid' : 'input'}>
              <input
                ref={noteRef}
                id="r-note"
                maxLength={MAX_NOTE_LENGTH}
                placeholder="e.g. Rent"
                value={draft.note}
                onChange={(e) => set('note', e.target.value)}
                aria-invalid={errors.note ? true : undefined}
                aria-describedby={errors.note ? 'r-note-error' : undefined}
              />
            </div>
            <FieldError id="r-note-error" message={errors.note} />
          </div>
        </div>

        <div className="dialog-footer">
          <span className="spacer" />
          <button className="btn btn-secondary" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
