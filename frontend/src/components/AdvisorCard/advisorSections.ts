import { rulesAnswerSchema, strategicPlanSchema, tacticalMoveSchema } from '../../schemas/ai.zod'
import type { FeatureType, RulesAnswer, StrategicPlan, TacticalMove } from '../../types/ai'
import type { AdvisorCardProps } from './AdvisorCard'

// Map a validated structured payload to AdvisorCard props, and runtime-validate
// a raw `structured` blob against the right schema for its feature.

/**
 * Validate a raw `structured` payload against the schema for its feature.
 * Returns the typed object, or null if absent/invalid (callers fall back to the
 * plain-text result field).
 */
export function parseStructured(feature: FeatureType, raw: unknown): RulesAnswer | StrategicPlan | TacticalMove | null {
  if (raw == null) return null
  switch (feature) {
    case 'rules': {
      const parsed = rulesAnswerSchema.safeParse(raw)
      return parsed.success ? parsed.data : null
    }
    case 'strategy': {
      const parsed = strategicPlanSchema.safeParse(raw)
      return parsed.success ? parsed.data : null
    }
    case 'move': {
      const parsed = tacticalMoveSchema.safeParse(raw)
      return parsed.success ? parsed.data : null
    }
    // tac_calc has no structured payload.
    default:
      return null
  }
}

export function rulesCard(answer: RulesAnswer): AdvisorCardProps {
  const sections = [
    { label: 'Rule basis', items: answer.rule_basis },
    { label: 'Assumptions', items: answer.assumptions },
    { label: 'Caveats', items: answer.caveats },
  ]
  if (answer.needs_exact_text) {
    sections.push({
      label: 'Note',
      items: ['A fully confident answer would require the exact card/rule text.'],
    })
  }
  return { heading: 'Rules answer', lead: answer.answer, sections }
}

export function strategyCard(plan: StrategicPlan): AdvisorCardProps {
  return {
    heading: 'Strategic plan',
    lead: plan.summary,
    sections: [
      { label: 'Faction read', text: plan.faction_read },
      { label: 'Opening priorities', items: plan.opening_priorities },
      { label: 'Round one plan', text: plan.round_one_plan },
      { label: 'Tech path', items: plan.tech_path },
      { label: 'Expansion targets', items: plan.expansion_targets },
      { label: 'Risks', items: plan.risks },
      { label: 'Mistakes to avoid', items: plan.mistakes_to_avoid },
    ],
  }
}

export function moveCard(move: TacticalMove): AdvisorCardProps {
  return {
    heading: 'Recommended move',
    lead: move.recommended_move,
    sections: [
      { label: 'Reasoning', text: move.reasoning },
      { label: 'Expected benefit', text: move.expected_benefit },
      { label: 'Combat risk', text: move.combat_risk },
      { label: 'Conservative alternative', text: move.alternative_conservative_move },
      { label: 'Aggressive alternative', text: move.alternative_aggressive_move },
      { label: 'Assumptions', items: move.assumptions },
    ],
  }
}
