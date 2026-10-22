import { useCallback, useEffect, useState } from 'react'
import { createExpense, deleteExpense, listExpenses, updateExpense } from './api/expenses'
import { AppShell, type View } from './components/AppShell'
import { BudgetPage } from './components/BudgetPage'
import { DashboardPage } from './components/DashboardPage'
import { ConfirmDeleteDialog } from './components/ConfirmDeleteDialog'
import { ExpenseFormDialog } from './components/ExpenseFormDialog'
import { Toast } from './components/Toast'
import { TransactionsPage, type LoadStatus } from './components/TransactionsPage'
import type { Expense, ExpenseInput } from './types'

/** Only show the skeleton if loading takes longer than this, to avoid a flash. */
const SKELETON_DELAY_MS = 300

type FormState = { mode: 'add' } | { mode: 'edit'; expense: Expense }

function App() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [showSkeleton, setShowSkeleton] = useState(false)
  const [form, setForm] = useState<FormState | null>(null)
  const [deleting, setDeleting] = useState<Expense | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [view, setView] = useState<View>('dashboard')
  // Bumped after every saved change, even if reloading the list then fails, so the dashboard
  // fetches its summary again.
  const [version, setVersion] = useState(0)
  const bumpVersion = () => setVersion((count) => count + 1)

  const load = useCallback(
    () =>
      listExpenses().then(
        (data) => {
          setExpenses(data)
          setStatus('ready')
        },
        () => setStatus('error'),
      ),
    [],
  )

  useEffect(() => {
    let ignore = false
    // State is set only after the request settles, never synchronously here.
    listExpenses().then(
      (data) => {
        if (ignore) return
        setExpenses(data)
        setStatus('ready')
      },
      () => !ignore && setStatus('error'),
    )
    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    if (status !== 'loading') return
    const timer = setTimeout(() => setShowSkeleton(true), SKELETON_DELAY_MS)
    return () => clearTimeout(timer)
  }, [status])

  const retry = () => {
    setStatus('loading')
    setShowSkeleton(false)
    void load()
  }

  // Errors propagate to the form, which keeps the dialog open and shows them.
  async function save(input: ExpenseInput) {
    if (form?.mode === 'edit') {
      await updateExpense(form.expense.id, input)
      setToast('Changes saved')
    } else {
      await createExpense(input)
      setToast('Expense added')
    }
    setForm(null)
    bumpVersion()
    await load()
  }

  function askDelete(expense: Expense) {
    setForm(null)
    setDeleteError(null)
    setDeleting(expense)
  }

  async function confirmDelete() {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      await deleteExpense(deleting.id)
      setDeleting(null)
      setToast('Expense deleted')
      bumpVersion()
      await load()
    } catch {
      setDeleteError('Couldn’t delete this expense. Try again.')
    } finally {
      setDeleteBusy(false)
    }
  }

  const clearToast = useCallback(() => setToast(null), [])
  const openAdd = () => setForm({ mode: 'add' })

  return (
    <AppShell view={view} onNavigate={setView} onAdd={openAdd}>
      {view === 'dashboard' ? (
        <DashboardPage
          expenses={expenses}
          status={status}
          version={version}
          onAdd={openAdd}
          onEdit={(expense) => setForm({ mode: 'edit', expense })}
          onDelete={askDelete}
          onViewAll={() => setView('transactions')}
          onOpenBudget={() => setView('budget')}
          onRetry={retry}
        />
      ) : view === 'budget' ? (
        <BudgetPage version={version} onSaved={setToast} />
      ) : (
        <TransactionsPage
          expenses={expenses}
          status={status}
          showSkeleton={showSkeleton}
          onAdd={openAdd}
          onEdit={(expense) => setForm({ mode: 'edit', expense })}
          onDelete={askDelete}
          onRetry={retry}
        />
      )}

      {form && (
        <ExpenseFormDialog
          key={form.mode === 'edit' ? form.expense.id : 'new'}
          expense={form.mode === 'edit' ? form.expense : undefined}
          onSave={save}
          onClose={() => setForm(null)}
          onRequestDelete={askDelete}
        />
      )}

      {deleting && (
        <ConfirmDeleteDialog
          expense={deleting}
          busy={deleteBusy}
          error={deleteError}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}

      {toast && <Toast message={toast} onDone={clearToast} />}
    </AppShell>
  )
}

export default App
