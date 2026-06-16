import styles from './TabNav.module.css'

// The 6-tab navigation bar, ported from the legacy `.tab-nav` (base.html +
// style.css). Active state is React-driven rather than DOM class toggling.

export interface TabDescriptor<Id extends string = string> {
  id: Id
  label: string
}

interface TabNavProps<Id extends string> {
  tabs: ReadonlyArray<TabDescriptor<Id>>
  activeTab: Id
  onSelect: (id: Id) => void
}

export function TabNav<Id extends string>({ tabs, activeTab, onSelect }: TabNavProps<Id>) {
  return (
    <div className={styles.tabNav} role="tablist" aria-label="Oracle Rex features">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`${styles.tabButton} ${isActive ? styles.active : ''}`}
            onClick={() => onSelect(tab.id)}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
