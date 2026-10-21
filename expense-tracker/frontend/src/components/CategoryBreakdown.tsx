import { getCategory } from '../lib/categories'
import { formatVND } from '../lib/money'
import { sharePercent } from '../lib/months'
import type { CategoryTotal } from '../types'
import { CategoryTile } from './CategoryTile'

type Props = { categories: CategoryTotal[]; total: number }

/** A stacked share bar and one row per category, largest first (the API already sorts them). */
export function CategoryBreakdown({ categories, total }: Props) {
  const description = categories
    .map((item) => `${getCategory(item.category_id).name} ${sharePercent(item.total, total)}%`)
    .join(', ')

  return (
    <section className="card panel" aria-labelledby="breakdown-title">
      <h2 className="panel-title" id="breakdown-title">
        Spending by category
      </h2>
      <div className="stack-bar" role="img" aria-label={`Share of spending: ${description}`}>
        {categories.map((item) => (
          <span
            key={item.category_id}
            style={{ flexGrow: item.total, background: getCategory(item.category_id).color }}
          />
        ))}
      </div>
      <ul className="breakdown-list">
        {categories.map((item) => {
          const category = getCategory(item.category_id)
          const share = sharePercent(item.total, total)
          return (
            <li className="breakdown-row" key={item.category_id}>
              <CategoryTile categoryId={item.category_id} size={36} />
              <span className="breakdown-main">
                <span className="breakdown-name">{category.name}</span>
                <span className="share-track" aria-hidden="true">
                  <span
                    style={{ width: `${(item.total / total) * 100}%`, background: category.color }}
                  />
                </span>
              </span>
              <span className="breakdown-figures">
                <span className="num breakdown-amount">{formatVND(item.total)}</span>
                <span className="num breakdown-share">{share}%</span>
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
