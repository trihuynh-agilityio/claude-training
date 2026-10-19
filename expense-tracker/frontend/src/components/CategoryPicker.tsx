import type { Ref } from 'react'
import { CATEGORIES, type CategoryId } from '../lib/categories'
import { CategoryTile } from './CategoryTile'

type Props = {
  value: string
  onChange: (id: CategoryId) => void
  labelId: string
  errorId?: string
  invalid: boolean
  /** Receives the selected button, or the first one when nothing is picked, for focusing. */
  focusRef?: Ref<HTMLButtonElement>
}

/** A 4-column grid of category buttons; the selected one has `aria-pressed`. */
export function CategoryPicker({ value, onChange, labelId, errorId, invalid, focusRef }: Props) {
  const focusTarget = CATEGORIES.some((c) => c.id === value) ? value : CATEGORIES[0].id

  return (
    <div
      className={invalid ? 'category-picker invalid' : 'category-picker'}
      role="group"
      aria-labelledby={labelId}
      aria-describedby={invalid ? errorId : undefined}
    >
      {CATEGORIES.map((category) => (
        <button
          key={category.id}
          ref={category.id === focusTarget ? focusRef : undefined}
          className="category-option"
          type="button"
          aria-pressed={category.id === value}
          onClick={() => onChange(category.id)}
        >
          <CategoryTile categoryId={category.id} size={36} />
          <span className="category-option-name">{category.name}</span>
        </button>
      ))}
    </div>
  )
}
