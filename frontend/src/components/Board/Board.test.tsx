import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Board } from './Board'
import { BOARD_POSITIONS } from './boardPositions'
import { sampleGame } from '../../test/fixtures'

describe('Board', () => {
  it('defines the 37 fixed hex positions', () => {
    expect(BOARD_POSITIONS).toHaveLength(37)
    expect(BOARD_POSITIONS[0]).toEqual({ position: '0-0', ring: 'mecatol' })
  })

  it('renders 37 hexes with no background image until a game loads', () => {
    const { container } = render(<Board />)
    const hexes = container.querySelectorAll('[data-position]')
    expect(hexes).toHaveLength(37)
    hexes.forEach((hex) => {
      expect((hex as HTMLElement).style.backgroundImage).toBe('')
    })
  })

  it('paints each hex with its tile image, with the Mecatol fallback at 0-0', () => {
    const { container } = render(<Board game={sampleGame} />)
    // sampleGame places tile_id 18 at 0-0.
    const mecatol = container.querySelector('[data-position="0-0"]') as HTMLElement
    expect(mecatol.style.backgroundImage).toContain('/static/images/systems/ST_18.webp')
    // A position with no placed system on a built board paints no image (there
    // is no ST_0 asset); it falls through to the hex's CSS ring color.
    const empty = container.querySelector('[data-position="4"]') as HTMLElement
    expect(empty.style.backgroundImage).toBe('')
  })
})
