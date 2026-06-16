import { DemoLabel } from '../DemoLabel/DemoLabel'
import styles from './AdvisorCard.module.css'

// Generic structured-result card: a heading, a lead paragraph, and any number of
// labelled sections (each a paragraph or a bullet list), with an optional demo
// label. Per-feature code maps a validated structured payload (RulesAnswer /
// StrategicPlan / TacticalMove) into these props via advisorSections.ts.

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
  /** When set, renders the demo note beneath the card. */
  demoLabel?: string
}

function hasContent(section: AdvisorSection): boolean {
  if (section.text && section.text.trim()) return true
  return Boolean(section.items && section.items.length > 0)
}

export function AdvisorCard({ heading, lead, sections = [], demoLabel }: AdvisorCardProps) {
  const visibleSections = sections.filter(hasContent)
  return (
    <div className={styles.root}>
      {heading && <h3 className={styles.heading}>{heading}</h3>}
      {lead && <p className={styles.lead}>{lead}</p>}
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
      {demoLabel && <DemoLabel label={demoLabel} />}
    </div>
  )
}
