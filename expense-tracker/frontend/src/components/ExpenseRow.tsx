import { getCategory } from '../lib/categories'
import { formatVND } from '../lib/money'
import type { Expense } from '../types'
import { CategoryTile } from './CategoryTile'
import { PencilIcon, TrashIcon } from './icons'

type Props = {
  expense: Expense
  onEdit: (expense: Expense) => void
  onDelete: (expense: Expense) => void
}

export function ExpenseRow({ expense, onEdit, onDelete }: Props) {
  const name = expense.note ?? `expense of ${formatVND(expense.amount)}`

  return (
    <li className="expense-row">
      <CategoryTile categoryId={expense.category_id} />
      <span className="expense-text">
        <span className={expense.note ? 'expense-note' : 'expense-note empty'}>
          {expense.note ?? 'No note'}
        </span>
        <span className="expense-category">{getCategory(expense.category_id).name}</span>
      </span>
      <span className="expense-amount num">{formatVND(expense.amount)}</span>
      <span className="row-actions">
        <button className="icon-btn" type="button" aria-label={`Edit ${name}`} onClick={() => onEdit(expense)}>
          <PencilIcon />
        </button>
        <button
          className="icon-btn danger"
          type="button"
          aria-label={`Delete ${name}`}
          onClick={() => onDelete(expense)}
        >
          <TrashIcon />
        </button>
      </span>
    </li>
  )
}
