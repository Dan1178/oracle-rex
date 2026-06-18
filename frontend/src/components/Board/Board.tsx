import { BOARD_POSITIONS, type Ring } from './boardPositions'
import type { Game } from '../../types/game'
import styles from './Board.module.css'

// The 37-hex Twilight Imperium board, ported from the static markup in
// templates/strategy.html + the hex-grid layout in static/css/style.css. The
// legacy setBoard() (static/js/app.js) mutated each hex's background image by
// tile_id; here that's derived from the `game` prop instead of DOM mutation.
// Reused by Strategy (Phase 5), Move (Phase 6), and Fleet Manager (Phase 7).

const ringClass: Record<Ring, string | undefined> = {
  mecatol: styles.mecatol,
  inner: styles.inner,
  middle: styles.middle,
  outer: undefined, // outer hexes carry no ring class in the legacy markup
}

/**
 * The tile image id for a position. Mirrors the legacy setBoard logic: a placed
 * system uses its tile_id; Mecatol Rex (0-0) with no tile falls back to "18".
 * Empty slots of a built board return null — there is no `ST_0` asset, so the
 * legacy "0" fallback only ever 404'd and fell through to the CSS ring color;
 * returning null skips that wasted request and renders identically. Also null
 * when no game is loaded yet (the bare grid renders with its CSS ring colors).
 */
function tileIdFor(game: Game | undefined, position: string): string | null {
  if (!game) return null
  const tile = game.board.find((t) => t.designation === position)
  if (tile?.system?.tile_id != null) return String(tile.system.tile_id)
  if (position === '0-0') return '18'
  return null
}

export interface BoardProps {
  game?: Game
  /** When provided, each hex becomes clickable (used by the Fleet Manager). */
  onHexClick?: (position: string) => void
  /** The hex to render in the enlarged "active" state (the open popover). */
  activePosition?: string | null
}

export function Board({ game, onHexClick, activePosition }: BoardProps) {
  const interactive = Boolean(onHexClick)
  return (
    <div className={styles.boardPreview}>
      <div className={styles.gridWrapper}>
        <div className={styles.hexGrid}>
          {BOARD_POSITIONS.map(({ position, ring }) => {
            const tileId = tileIdFor(game, position)
            const isActive = activePosition === position
            const className = [
              styles.hex,
              ringClass[ring],
              isActive && styles.active,
              interactive && styles.clickable,
            ]
              .filter(Boolean)
              .join(' ')
            return (
              <div
                key={position}
                className={className}
                data-position={position}
                role={interactive ? 'button' : undefined}
                tabIndex={interactive ? 0 : undefined}
                aria-pressed={interactive ? isActive : undefined}
                onClick={onHexClick ? () => onHexClick(position) : undefined}
                onKeyDown={
                  onHexClick
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onHexClick(position)
                        }
                      }
                    : undefined
                }
                style={
                  tileId
                    ? {
                        backgroundImage: `url('/static/images/systems/ST_${tileId}.webp')`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                      }
                    : undefined
                }
              >
                <span className={styles.designationText}>{position}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
