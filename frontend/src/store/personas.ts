// The selectable AI personas (tone only). Ids must match the backend registry in
// core/service/ai/personas.py. A persona flavors the voice of live AI responses;
// it never changes accuracy or structure, and does not apply to demo responses.

export interface PersonaOption {
  id: string
  label: string
}

export const PERSONAS: PersonaOption[] = [
  { id: 'default', label: 'None (default voice)' },
  { id: 'oracle', label: 'Ancient Oracle' },
  { id: 'war_machine', label: 'Hostile War Machine' },
]

export const DEFAULT_PERSONA = 'default'
