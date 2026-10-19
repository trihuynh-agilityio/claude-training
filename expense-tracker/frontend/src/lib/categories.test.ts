import { describe, expect, it } from 'vitest'
import { CATEGORIES, getCategory, isCategoryId } from './categories'

describe('CATEGORIES', () => {
  it('lists the 8 design categories with unique ids', () => {
    expect(CATEGORIES).toHaveLength(8)
    expect(new Set(CATEGORIES.map((c) => c.id)).size).toBe(8)
  })

  it('uses the first letter of each name for the tile', () => {
    for (const category of CATEGORIES) expect(category.letter).toBe(category.name[0])
  })
})

describe('getCategory', () => {
  it('finds a category by id', () => {
    expect(getCategory('transport').name).toBe('Transport')
  })

  it('falls back to Other for an unknown id', () => {
    expect(getCategory('coffee').id).toBe('other')
  })
})

describe('isCategoryId', () => {
  it('accepts only known ids', () => {
    expect(isCategoryId('food')).toBe(true)
    expect(isCategoryId('')).toBe(false)
    expect(isCategoryId('Food')).toBe(false)
  })
})
