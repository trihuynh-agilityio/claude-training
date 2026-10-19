import type { ReactNode } from 'react'
import { ListIcon, LogoIcon, PlusIcon } from './icons'

type Props = { onAdd: () => void; children: ReactNode }

export function AppShell({ onAdd, children }: Props) {
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
          <a className="nav-link" href="/" aria-current="page">
            <ListIcon />
            Transactions
          </a>
        </nav>
      </aside>

      <main className="main">{children}</main>

      <nav className="bottom-bar" aria-label="Main (mobile)">
        <a className="nav-link" href="/" aria-current="page">
          <ListIcon size={22} />
          Transactions
        </a>
        <button className="fab" type="button" onClick={onAdd} aria-label="Add expense">
          <PlusIcon size={26} />
        </button>
      </nav>
    </div>
  )
}
