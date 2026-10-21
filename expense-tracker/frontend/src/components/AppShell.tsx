import type { ReactNode } from 'react'
import { HomeIcon, ListIcon, LogoIcon, PlusIcon } from './icons'

export type View = 'dashboard' | 'transactions'

type Props = {
  view: View
  onNavigate: (view: View) => void
  onAdd: () => void
  children: ReactNode
}

const NAV: { view: View; label: string; Icon: typeof ListIcon }[] = [
  { view: 'dashboard', label: 'Dashboard', Icon: HomeIcon },
  { view: 'transactions', label: 'Transactions', Icon: ListIcon },
]

export function AppShell({ view, onNavigate, onAdd, children }: Props) {
  const navLink = (item: (typeof NAV)[number], size?: number) => (
    <button
      key={item.view}
      className="nav-link"
      type="button"
      aria-current={view === item.view ? 'page' : undefined}
      onClick={() => onNavigate(item.view)}
    >
      <item.Icon size={size} />
      {item.label}
    </button>
  )

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <LogoIcon />
          </span>
          Expense Tracker
        </div>
        <button className="btn btn-primary" type="button" onClick={onAdd}>
          <PlusIcon />
          Add expense
        </button>
        <nav className="nav" aria-label="Main">
          {NAV.map((item) => navLink(item))}
        </nav>
      </aside>

      <main className="main">{children}</main>

      <nav className="bottom-bar" aria-label="Main (mobile)">
        {navLink(NAV[0], 22)}
        <button className="fab" type="button" onClick={onAdd} aria-label="Add expense">
          <PlusIcon size={26} />
        </button>
        {navLink(NAV[1], 22)}
      </nav>
    </div>
  )
}
