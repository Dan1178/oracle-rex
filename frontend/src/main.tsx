import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { QueryProvider } from './providers/QueryProvider.tsx'
import { SettingsProvider } from './store/settings.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryProvider>
      <SettingsProvider>
        <App />
      </SettingsProvider>
    </QueryProvider>
  </StrictMode>,
)
