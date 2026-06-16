import type { Player } from '../../types/game'
import styles from './FactionSelect.module.css'

// Faction dropdown populated from the parsed game's players, ported from the
// faction-select wiring in setBoard() (static/js/app.js). The legacy id
// "faction-select strategy" (a space-in-id footgun) is gone; this is a plain
// controlled select reused by Strategy (Phase 5) and Move (Phase 6).

export interface FactionSelectProps {
  players: Player[]
  value: string
  onChange: (faction: string) => void
  disabled?: boolean
  /** Accessible label / id-free association for the select. */
  label?: string
}

export function FactionSelect({
  players,
  value,
  onChange,
  disabled = false,
  label = 'Faction',
}: FactionSelectProps) {
  // Only players with an assigned faction are selectable (matches legacy).
  const factions = players.filter((p) => p.faction)

  return (
    <select
      className={styles.select}
      aria-label={label}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{disabled ? 'Enter a TTS String to load a board state' : 'Select Faction'}</option>
      {factions.map((player, i) => (
        <option key={player.faction} value={player.faction as string}>
          {player.faction} (Player {i + 1})
        </option>
      ))}
    </select>
  )
}
