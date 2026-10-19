const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** A local Date as YYYY-MM-DD (not UTC, so "today" matches the user's clock). */
export function toISODate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function todayISO(now: Date = new Date()): string {
  return toISODate(now)
}

export function addDays(iso: string, days: number): string {
  const date = parseISODate(iso)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

/** "2026-10-14" → "Tue 14 Oct". */
export function formatShortDate(iso: string): string {
  const date = parseISODate(iso)
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`
}

/** Day group label: "Today · Thu 16 Oct", "Yesterday · Wed 15 Oct" or "Tue 14 Oct". */
export function formatDayLabel(iso: string, today: string = todayISO()): string {
  const short = formatShortDate(iso)
  if (iso === today) return `Today · ${short}`
  if (iso === addDays(today, -1)) return `Yesterday · ${short}`
  return short
}

export type DayGroup<T> = { date: string; label: string; total: number; items: T[] }

/** Group items that are already sorted by date into consecutive days with subtotals. */
export function groupByDay<T extends { date: string; amount: number }>(
  items: T[],
  today: string = todayISO(),
): DayGroup<T>[] {
  const groups: DayGroup<T>[] = []
  for (const item of items) {
    let group = groups.at(-1)
    if (!group || group.date !== item.date) {
      group = { date: item.date, label: formatDayLabel(item.date, today), total: 0, items: [] }
      groups.push(group)
    }
    group.items.push(item)
    group.total += item.amount
  }
  return groups
}
