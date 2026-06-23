import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { JobResultView } from './JobResultView'
import { completedRulesResult, demoTacticalResult } from '../../test/fixtures'

describe('JobResultView', () => {
  it('renders a structured rules answer as a card', () => {
    render(<JobResultView feature="rules" result={completedRulesResult} />)
    expect(screen.getByRole('heading', { name: /rules answer/i })).toBeInTheDocument()
    expect(screen.getByText(/Space combat, Retreat step/)).toBeInTheDocument()
  })

  it('falls back to plain text and shows the demo label for tac_calc', () => {
    render(<JobResultView feature="tac_calc" result={demoTacticalResult} />)
    expect(screen.getByText(/Odds of Victory: 71%/)).toBeInTheDocument()
    expect(screen.getByText(/saved scenario/i)).toBeInTheDocument()
  })

  it('falls back to the text field when structured data is missing', () => {
    render(<JobResultView feature="rules" result={{ answer: 'Plain answer only.' }} />)
    expect(screen.getByText('Plain answer only.')).toBeInTheDocument()
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })
})
