// The 37 fixed board hex positions + their ring, in the same order as the legacy
// markup (templates/strategy.html). Kept separate from Board.tsx so the
// component file exports only a component (React Fast Refresh requirement).

export type Ring = 'mecatol' | 'inner' | 'middle' | 'outer'

export interface HexPosition {
  position: string
  ring: Ring
}

export const BOARD_POSITIONS: HexPosition[] = [
  { position: '0-0', ring: 'mecatol' },
  // Inner ring (6)
  { position: '1-4', ring: 'inner' },
  { position: '2-4', ring: 'inner' },
  { position: '3-4', ring: 'inner' },
  { position: '4-4', ring: 'inner' },
  { position: '5-4', ring: 'inner' },
  { position: '6-4', ring: 'inner' },
  // Middle ring (12)
  { position: '1-1', ring: 'middle' },
  { position: '1-3', ring: 'middle' },
  { position: '2-1', ring: 'middle' },
  { position: '2-3', ring: 'middle' },
  { position: '3-1', ring: 'middle' },
  { position: '3-3', ring: 'middle' },
  { position: '4-1', ring: 'middle' },
  { position: '4-3', ring: 'middle' },
  { position: '5-1', ring: 'middle' },
  { position: '5-3', ring: 'middle' },
  { position: '6-1', ring: 'middle' },
  { position: '6-3', ring: 'middle' },
  // Outer ring (18)
  { position: '1', ring: 'outer' },
  { position: '1-0', ring: 'outer' },
  { position: '2-2', ring: 'outer' },
  { position: '2', ring: 'outer' },
  { position: '2-0', ring: 'outer' },
  { position: '3-2', ring: 'outer' },
  { position: '3', ring: 'outer' },
  { position: '3-0', ring: 'outer' },
  { position: '4-2', ring: 'outer' },
  { position: '4', ring: 'outer' },
  { position: '4-0', ring: 'outer' },
  { position: '5-2', ring: 'outer' },
  { position: '5', ring: 'outer' },
  { position: '5-0', ring: 'outer' },
  { position: '6-2', ring: 'outer' },
  { position: '6', ring: 'outer' },
  { position: '6-0', ring: 'outer' },
  { position: '1-2', ring: 'outer' },
]
