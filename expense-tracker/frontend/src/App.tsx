import { useEffect, useState } from 'react'

type HealthStatus = 'checking' | 'ok' | 'unavailable'

function App() {
  const [status, setStatus] = useState<HealthStatus>('checking')

  useEffect(() => {
    fetch('/api/health')
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data: { status: string }) =>
        setStatus(data.status === 'ok' ? 'ok' : 'unavailable'),
      )
      .catch(() => setStatus('unavailable'))
  }, [])

  return (
    <main>
      <h1>Personal Expense Tracker</h1>
      <p>
        API status: <strong>{status}</strong>
      </p>
    </main>
  )
}

export default App
