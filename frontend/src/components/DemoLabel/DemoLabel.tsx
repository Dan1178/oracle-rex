import styles from './DemoLabel.module.css'

// The note shown alongside a demo result so it is never mistaken for a live
// answer. Defaults to the backend's DEMO_LABEL copy (core/demo/__init__.py).

export const DEFAULT_DEMO_LABEL =
  'Demo response generated from a saved scenario. ' +
  'Use Live AI Mode (your own API key or an access code) to generate a fresh response.'

export interface DemoLabelProps {
  label?: string
}

export function DemoLabel({ label = DEFAULT_DEMO_LABEL }: DemoLabelProps) {
  return <p className={styles.root}>{label}</p>
}
