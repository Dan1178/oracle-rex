import { useState } from 'react'

import { TabNav, type TabDescriptor } from './components/TabNav/TabNav'
import { BattleCalculator } from './features/battleCalculator/BattleCalculator'
import { SettingsPanel } from './features/settings/SettingsPanel'
import { useDemoConfig } from './hooks/useDemoConfig'
import styles from './App.module.css'

// The SPA shell: the app header, the 6-tab navigation, and the active tab's
// panel. Settings is live (Phase 2); the remaining feature tabs land in later
// Milestone 5 phases and show a short placeholder until then. The legacy
// plain-JS app stays reachable at /legacy until the Phase 8 cutover.

type TabId = 'settings' | 'rules' | 'strategy' | 'fleet' | 'move' | 'tactical'

// Order mirrors the legacy tab bar (base.html).
const TABS: ReadonlyArray<TabDescriptor<TabId>> = [
  { id: 'settings', label: 'Settings' },
  { id: 'rules', label: 'Rules Q&A' },
  { id: 'strategy', label: 'Strategy Suggester' },
  { id: 'fleet', label: 'Fleet Manager' },
  { id: 'move', label: 'Move Suggester' },
  { id: 'tactical', label: 'Tactical Calculator' },
]

const COMING_SOON: Record<'rules' | 'strategy' | 'fleet' | 'move', string> = {
  rules: 'Rules Q&A arrives in Phase 4.',
  strategy: 'The Strategy Suggester arrives in Phase 5.',
  fleet: 'The Fleet Manager arrives in Phase 7.',
  move: 'The Move Suggester arrives in Phase 6.',
}

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('settings')

  // Bootstrap the demo catalog + live-demo status on mount so each feature tab
  // can render its one-click sample without a per-tab fetch. Failures are
  // non-fatal here; the demo buttons simply stay unavailable.
  useDemoConfig()

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Oracle Rex — Twilight Imperium Companion</h1>
      <p className={styles.tagline}>
        An AI strategy assistant for Twilight Imperium: it parses board states, renders game maps,
        estimates combat odds, and generates faction-specific strategy. Every feature has a
        one-click <strong>Demo</strong> — no API key needed.
      </p>

      <TabNav tabs={TABS} activeTab={activeTab} onSelect={setActiveTab} />

      <main role="tabpanel">
        {activeTab === 'settings' && <SettingsPanel />}
        {activeTab === 'tactical' && <BattleCalculator />}
        {activeTab !== 'settings' && activeTab !== 'tactical' && (
          <p className={styles.placeholder}>{COMING_SOON[activeTab]}</p>
        )}
      </main>
    </div>
  )
}

export default App
