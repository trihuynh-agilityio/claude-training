/** The fixed category ids; must match `CategoryId` in backend/app/schemas.py. */
export type CategoryId = 'food' | 'transport' | 'bills' | 'shopping' | 'leisure' | 'health' | 'education' | 'other'

export type Category = { id: CategoryId; name: string; letter: string; color: string }

/** Names, letters and tile colors from design/DESIGN.md section 2, in picker order. */
export const CATEGORIES: readonly Category[] = [
  { id: 'food', name: 'Food & Dining', letter: 'F', color: '#C2541F' },
  { id: 'transport', name: 'Transport', letter: 'T', color: '#2563EB' },
  { id: 'bills', name: 'Bills & Utilities', letter: 'B', color: '#6D4AE0' },
  { id: 'shopping', name: 'Shopping', letter: 'S', color: '#C0368A' },
  { id: 'leisure', name: 'Leisure', letter: 'L', color: '#0D7F84' },
  { id: 'health', name: 'Health', letter: 'H', color: '#15803D' },
  { id: 'education', name: 'Education', letter: 'E', color: '#475569' },
  { id: 'other', name: 'Other', letter: 'O', color: '#6B7280' },
]

const BY_ID = new Map(CATEGORIES.map((category) => [category.id, category]))

/** Look up a category, falling back to Other for an id this build doesn't know. */
export function getCategory(id: string): Category {
  return BY_ID.get(id as CategoryId) ?? BY_ID.get('other')!
}

export function isCategoryId(value: string): value is CategoryId {
  return BY_ID.has(value as CategoryId)
}
