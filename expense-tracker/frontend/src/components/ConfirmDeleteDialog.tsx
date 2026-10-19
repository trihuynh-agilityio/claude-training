import { useRef } from 'react'
import { getCategory } from '../lib/categories'
import { formatShortDate } from '../lib/dates'
import { formatVND } from '../lib/money'
import type { Expense } from '../types'
import { CategoryTile } from './CategoryTile'
import { AlertIcon, TrashIcon } from './icons'
import { useModalDialog } from './useModalDialog'

type Props = {
  expense: Expense
  busy: boolean
  error: string | null
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDeleteDialog({ expense, busy, error, onConfirm, onCancel }: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  // Cancel gets focus, so pressing Enter never deletes by accident.
  const dialogRef = useModalDialog(cancelRef)

  return (
    <dialog
      ref={dialogRef}
      className="dialog dialog-confirm"
      role="alertdialog"
      aria-labelledby="delete-title"
      aria-describedby="delete-desc"
      onCancel={(event) => {
        event.preventDefault()
        onCancel()
      }}
    >
      <div className="confirm-body">
        <span className="confirm-icon">
          <TrashIcon size={22} />
        </span>
        <div>
          <h2 className="state-title" id="delete-title" style={{ marginBottom: 6 }}>
            Delete this expense?
          </h2>
          <p className="state-text" id="delete-desc">
            It will be removed from your totals. This can’t be undone.
          </p>
        </div>
        <div className="confirm-summary">
          <CategoryTile categoryId={expense.category_id} size={36} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 500 }}>{expense.note ?? 'No note'}</div>
            <div className="confirm-meta">
              {getCategory(expense.category_id).name} · {formatShortDate(expense.date)}
            </div>
          </div>
          <span className="num" style={{ fontWeight: 600 }}>
            {formatVND(expense.amount)}
          </span>
        </div>
        {error && (
          <div className="alert" role="alert">
            <AlertIcon />
            <span>{error}</span>
          </div>
        )}
        <div className="confirm-actions">
          <button ref={cancelRef} className="btn btn-secondary" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-danger" type="button" onClick={onConfirm} disabled={busy}>
            {busy ? 'Deleting…' : 'Delete expense'}
          </button>
        </div>
      </div>
    </dialog>
  )
}
