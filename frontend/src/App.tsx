import { useEffect, useState } from 'react'

// Phase 0 placeholder app. Its only job is to prove the React/TS/Vite build is
// wired into Django end-to-end: it renders, and it can reach the real API on the
// same host (no CORS) by fetching the demo catalog. Real features arrive in the
// later Milestone 5 phases.

interface DemoCatalog {
  label: string
  scenarios: Record<string, unknown>
}

type FetchState =
  | { status: 'loading' }
  | { status: 'ok'; catalog: DemoCatalog }
  | { status: 'error'; message: string }

function App() {
  const [state, setState] = useState<FetchState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    fetch('/api/demo/catalog/')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<DemoCatalog>
      })
      .then((catalog) => {
        if (!cancelled) setState({ status: 'ok', catalog })
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            status: 'error',
            message: err instanceof Error ? err.message : String(err),
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
      <h1>Oracle Rex — React migration</h1>
      <p>Milestone 5 · Phase 0 — build integration verified.</p>
      <section>
        <h2>API connectivity</h2>
        {state.status === 'loading' && <p>Contacting the API…</p>}
        {state.status === 'error' && (
          <p style={{ color: 'crimson' }}>
            Could not reach <code>/api/demo/catalog/</code>: {state.message}
          </p>
        )}
        {state.status === 'ok' && (
          <p style={{ color: 'green' }}>
            Connected. Demo catalog “{state.catalog.label}” lists{' '}
            {Object.keys(state.catalog.scenarios).length} scenario(s).
          </p>
        )}
      </section>
    </main>
  )
}

export default App
