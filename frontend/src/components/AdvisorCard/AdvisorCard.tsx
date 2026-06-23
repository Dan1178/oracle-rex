import { DemoLabel } from '../DemoLabel/DemoLabel'
import styles from './AdvisorCard.module.css'

// Generic structured-result "screen": a HUD status strip, then a heading, a lead
// paragraph, and any number of labelled sections (each a paragraph or a bullet
// list), with an optional demo label. Per-feature code maps a validated
// structured payload (RulesAnswer / StrategicPlan / TacticalMove) into these
// props via advisorSections.ts. The plain-text fallback (tac_calc, or an
// unstructured response) renders through the same screen via the `text` prop.

export interface AdvisorSection {
  label: string
  /** A paragraph of prose. Mutually exclusive with `items`. */
  text?: string
  /** A bullet list. Mutually exclusive with `text`. */
  items?: string[]
}

export interface AdvisorCardProps {
  heading?: string
  /** The primary answer/summary paragraph, rendered above the sections. */
  lead?: string
  sections?: AdvisorSection[]
  /** Plain-text result, rendered in place of structured sections. */
  text?: string
  /** Status-strip label, shown after the `◉ ORACLE //` prefix. */
  statusLabel?: string
  /** Right-aligned status-strip metadata (e.g. faction · prompt version). */
  statusMeta?: string
  /** When set, renders the demo note beneath the content. */
  demoLabel?: string
}

function hasContent(section: AdvisorSection): boolean {
  if (section.text && section.text.trim()) return true
  return Boolean(section.items && section.items.length > 0)
}

export function AdvisorCard({
  heading,
  lead,
  sections = [],
  text,
  statusLabel = 'RESPONSE',
  statusMeta,
  demoLabel,
}: AdvisorCardProps) {
  const visibleSections = sections.filter(hasContent)
  return (
    <div className={styles.root}>
      <div className={styles.statusBar}>
        <span className={styles.led} aria-hidden="true" />
        <span className={styles.statusLabel}>{`◉ ORACLE // ${statusLabel}`}</span>
        <span className={styles.spacer} />
        {statusMeta && <span className={styles.statusMeta}>{statusMeta}</span>}
      </div>
      <div className={styles.body}>
        {heading && <h3 className={styles.heading}>{heading}</h3>}
        {lead && (
          <p className={styles.lead}>
            {lead}
            <span className={styles.cursor} aria-hidden="true" />
          </p>
        )}
        {visibleSections.map((section) => (
          <div className={styles.section} key={section.label}>
            <p className={styles.sectionLabel}>{section.label}</p>
            {section.items ? (
              <ul className={styles.sectionList}>
                {section.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className={styles.sectionText}>{section.text}</p>
            )}
          </div>
        ))}
        {text && <p className={styles.textResult}>{text}</p>}
        {demoLabel && <DemoLabel label={demoLabel} />}
      </div>
    </div>
  )
}
