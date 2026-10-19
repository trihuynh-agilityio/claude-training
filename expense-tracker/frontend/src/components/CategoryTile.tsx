import { getCategory } from '../lib/categories'

type Props = {
  categoryId: string
  size?: number
}

/** A rounded square in the category color with its white initial letter. */
export function CategoryTile({ categoryId, size = 40 }: Props) {
  const category = getCategory(categoryId)
  return (
    <span
      className="tile category-tile"
      style={{ width: size, height: size, background: category.color }}
      aria-hidden="true"
    >
      {category.letter}
    </span>
  )
}
