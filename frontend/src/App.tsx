import { useState } from 'react'

import { Starfield } from './components/Starfield/Starfield'
import { TabNav, type TabDescriptor } from './components/TabNav/TabNav'
import { BattleCalculator } from './features/battleCalculator/BattleCalculator'
import { FleetManagerPanel } from './features/fleetManager/FleetManagerPanel'
import { RulesPanel } from './features/rulesChat/RulesPanel'
import { SettingsPanel } from './features/settings/SettingsPanel'
import { StrategyPanel } from './features/strategicPlan/StrategyPanel'
import { MovePanel } from './features/tacticalMove/MovePanel'
import { useDemoConfig } from './hooks/useDemoConfig'
import type { Game } from './types/game'
import styles from './App.module.css'

// The SPA shell: the app header, the 6-tab navigation, and the feature panels.
// All six panels stay mounted; the inactive ones are hidden (display:none via
// the `hidden` attribute) rather than unmounted, so each tab keeps its state
// (board, inputs, results) when you switch away and back.

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

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('settings')
  // A board exported from the Fleet Manager, handed to the Move Suggester.
  const [moveSeed, setMoveSeed] = useState<Game>()

  // Bootstrap the demo catalog + live-demo status on mount so each feature tab
  // can render its one-click sample without a per-tab fetch. Failures are
  // non-fatal here; the demo buttons simply stay unavailable.
  useDemoConfig()

  const exportToMove = (game: Game) => {
    setMoveSeed(game)
    setActiveTab('move')
  }

  return (
    <>
      <Starfield />
      <div className={styles.container}>
        <span className={styles.bracketBl} aria-hidden="true" />
        <span className={styles.bracketBr} aria-hidden="true" />
        <h1 className={styles.title}>Oracle Rex: Twilight Imperium Companion</h1>
        <p className={styles.tagline}>
          An AI strategy assistant for Twilight Imperium: it parses board states,
          renders game maps, estimates combat odds, and generates faction-specific
          strategy. Every feature runs on <strong>free live AI</strong> with no key
          needed; saved demos remain as an instant fallback.
        </p>

        <TabNav tabs={TABS} activeTab={activeTab} onSelect={setActiveTab} />

        <main>
          <div role="tabpanel" hidden={activeTab !== 'settings'}>
            <SettingsPanel />
          </div>
          <div role="tabpanel" hidden={activeTab !== 'rules'}>
            <RulesPanel />
          </div>
          <div role="tabpanel" hidden={activeTab !== 'strategy'}>
            <StrategyPanel />
          </div>
          <div role="tabpanel" hidden={activeTab !== 'fleet'}>
            <FleetManagerPanel onExport={exportToMove} />
          </div>
          <div role="tabpanel" hidden={activeTab !== 'move'}>
            <MovePanel seed={moveSeed} />
          </div>
          <div role="tabpanel" hidden={activeTab !== 'tactical'}>
            <BattleCalculator />
          </div>
        </main>
      </div>
    </>
  )
}

export default App
