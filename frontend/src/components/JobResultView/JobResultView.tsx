import { AdvisorCard } from '../AdvisorCard/AdvisorCard'
import cardStyles from '../AdvisorCard/AdvisorCard.module.css'
import { moveCard, parseStructured, rulesCard, strategyCard } from '../AdvisorCard/advisorSections'
import { DemoLabel } from '../DemoLabel/DemoLabel'
import type { FeatureType, JobResult } from '../../types/ai'

// The shared result renderer: structured payloads (rules / strategy / move)
// render as an AdvisorCard; tac_calc (and any response without valid structured
// data) falls back to the plain-text result field. A demo label is shown
// whenever the result is tagged as a demo response.

export interface JobResultViewProps {
  feature: FeatureType
  result: JobResult
}

/** The plain-text field the worker returns for each feature. */
function fallbackText(feature: FeatureType, result: JobResult): string {
  switch (feature) {
    case 'rules':
      return result.answer ?? 'No answer was returned.'
    case 'strategy':
    case 'move':
      return result.strategy ?? 'No recommendation was returned.'
    case 'tac_calc':
      return result.calc_results ?? 'No result was returned.'
    default:
      return 'No result was returned.'
  }
}

export function JobResultView({ feature, result }: JobResultViewProps) {
  const demoLabel = result.demo ? (result.demo_label ?? '') || undefined : undefined
  const structured = parseStructured(feature, result.structured)

  if (structured) {
    let props
    if (feature === 'rules') {
      props = rulesCard(structured as Parameters<typeof rulesCard>[0])
    } else if (feature === 'strategy') {
      props = strategyCard(structured as Parameters<typeof strategyCard>[0])
    } else {
      props = moveCard(structured as Parameters<typeof moveCard>[0])
    }
    return <AdvisorCard {...props} demoLabel={demoLabel} />
  }

  // Text fallback (tac_calc, or a response missing valid structured data).
  return (
    <div className={cardStyles.root}>
      <p className={cardStyles.textResult}>{fallbackText(feature, result)}</p>
      {demoLabel && <DemoLabel label={demoLabel} />}
    </div>
  )
}
