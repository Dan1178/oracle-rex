import { useState, type ChangeEvent } from 'react'
import { useMutation } from '@tanstack/react-query'

import { Board } from '../../components/Board/Board'
import { ErrorState } from '../../components/ErrorState/ErrorState'
import { ApiError, buildGameFromTts } from '../../api/oracleRexApi'
import { gameSchema } from '../../schemas/game.zod'
import type { Game } from '../../types/game'
import {
  adjustGroundCount,
  adjustShipCount,
  setFleetOwner,
  setPlanetOwner,
  systemAt,
} from './fleetModel'
import { FleetPopover } from './FleetPopover'
import styles from './FleetManagerPanel.module.css'

// Fleet Manager — the interactive board editor (ports templates/fleet.html +
// static/js/fleet_manager.js). A TTS string builds a board; clicking a system
// hex opens the fleet-management popover for editing ships, ground forces, and
// owners; the board can be exported to the Move Suggester or saved / loaded /
// copied as JSON. All board state is React state (no window.fleetGameData, no
// DOM mutation, no space-in-id element ids).

type MessageTone = 'ok' | 'warn' | 'error'

export interface FleetManagerPanelProps {
  /** Hand the current board to the Move Suggester (App seeds it + switches tab). */
  onExport?: (game: Game) => void
}

export function FleetManagerPanel({ onExport }: FleetManagerPanelProps) {
  const [ttsInput, setTtsInput] = useState('')
  const [game, setGame] = useState<Game>()
  const [activeDesignation, setActiveDesignation] = useState<string | null>(null)
  const [message, setMessage] = useState<{ text: string; tone: MessageTone } | null>(
    null,
  )

  const buildMutation = useMutation({
    mutationFn: (tts: string) => buildGameFromTts(tts, 'fleet'),
  })

  const buildError =
    buildMutation.error instanceof ApiError
      ? buildMutation.error.message
      : buildMutation.error
        ? 'Could not build the board from that TTS string.'
        : undefined

  const activeSystem = systemAt(game, activeDesignation)
  const busy = buildMutation.isPending

  const generate = async () => {
    const tts = ttsInput.trim()
    if (!tts) return
    setActiveDesignation(null)
    setMessage(null)
    try {
      const built = await buildMutation.mutateAsync(tts)
      setGame(built)
    } catch {
      // Surfaced via buildError.
    }
  }

  // Only systems (a hex with a tile_id) open the popover; clicking empty space
  // or Mecatol's blank slots is a no-op, as in the legacy hasImage guard.
  const handleHexClick = (position: string) => {
    if (!systemAt(game, position)) return
    setActiveDesignation(position)
  }

  const shipDelta = (unit: string, delta: number) => {
    if (!activeDesignation) return
    setGame((g) => (g ? adjustShipCount(g, activeDesignation, unit, delta) : g))
  }

  const fleetOwnerChange = (owner: string) => {
    if (!activeDesignation) return
    setGame((g) => (g ? setFleetOwner(g, activeDesignation, owner) : g))
  }

  const groundDelta = (planetIndex: number, unit: string, delta: number) => {
    if (!activeDesignation) return
    setGame((g) =>
      g ? adjustGroundCount(g, activeDesignation, planetIndex, unit, delta) : g,
    )
  }

  const planetOwnerChange = (planetIndex: number, owner: string) => {
    if (!activeDesignation) return
    setGame((g) => (g ? setPlanetOwner(g, activeDesignation, planetIndex, owner) : g))
  }

  const handleExport = () => {
    if (!game) return
    onExport?.(game)
    setMessage({ text: 'Board exported to the Move Suggester.', tone: 'ok' })
  }

  const handleSave = () => {
    if (!game) return
    try {
      const text = JSON.stringify(game, null, 2)
      const blob = new Blob([text], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'oracle-rex-game-data.json'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setMessage({ text: 'Game state downloaded!', tone: 'ok' })
    } catch {
      setMessage({ text: 'Error downloading game state.', tone: 'error' })
    }
  }

  const handleLoad = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    // Reset the input so re-selecting the same file fires onChange again.
    event.target.value = ''
    if (!file) {
      setMessage({ text: 'No file selected.', tone: 'warn' })
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const parsed = gameSchema.parse(JSON.parse(String(e.target?.result)))
        setGame(parsed)
        setActiveDesignation(null)
        setMessage({ text: 'Game state loaded!', tone: 'ok' })
      } catch {
        setMessage({
          text: 'Error loading game state: invalid game JSON.',
          tone: 'error',
        })
      }
    }
    reader.onerror = () => setMessage({ text: 'Error reading file.', tone: 'error' })
    reader.readAsText(file)
  }

  const handleCopy = async () => {
    if (!game) return
    try {
      await navigator.clipboard.writeText(JSON.stringify(game, null, 2))
      setMessage({ text: 'Game state copied to clipboard!', tone: 'ok' })
    } catch {
      setMessage({ text: 'Error copying to clipboard.', tone: 'error' })
    }
  }

  return (
    <section aria-labelledby="fleet-heading">
      <h2 id="fleet-heading">Fleet Manager</h2>
      <p className={styles.intro}>
        Build a board from a TTS string, then click any system hex to place ships,
        ground forces, and structures. Export the result to the Move Suggester, or save
        / load / copy the game state as JSON.
      </p>

      <p className={styles.byok}>
        Don&apos;t have a TTS String? Generate a game (6 player only):{' '}
        <a href="https://milty.shenanigans.be/" target="_blank" rel="noreferrer">
          https://milty.shenanigans.be/
        </a>
      </p>

      <div className={styles.ttsRow}>
        <input
          type="text"
          className={styles.ttsInput}
          aria-label="TTS string"
          placeholder="Paste TTS String from Milty draft tool"
          value={ttsInput}
          onChange={(e) => setTtsInput(e.target.value)}
        />
        <button
          type="button"
          className={styles.button}
          onClick={() => void generate()}
          disabled={busy || ttsInput.trim() === ''}
        >
          Generate
        </button>
        <button
          type="button"
          className={styles.button}
          onClick={handleExport}
          disabled={!game}
        >
          Export to Move Suggester
        </button>
      </div>

      <div className={styles.ioRow}>
        <button
          type="button"
          className={styles.button}
          onClick={handleSave}
          disabled={!game}
        >
          Save Game State
        </button>
        <label className={styles.fileLabel}>
          Load Game State
          <input
            type="file"
            accept=".json"
            onChange={handleLoad}
            className={styles.fileInput}
          />
        </label>
        <button
          type="button"
          className={styles.button}
          onClick={handleCopy}
          disabled={!game}
        >
          Copy to Clipboard
        </button>
      </div>

      {message && (
        <p className={styles.message} data-tone={message.tone}>
          {message.text}
        </p>
      )}

      {buildError && (
        <ErrorState message={buildError} onRetry={() => void generate()} />
      )}

      <Board
        game={game}
        onHexClick={game ? handleHexClick : undefined}
        activePosition={activeDesignation}
      />

      {activeSystem && (
        <FleetPopover
          system={activeSystem}
          onShipDelta={shipDelta}
          onFleetOwnerChange={fleetOwnerChange}
          onGroundDelta={groundDelta}
          onPlanetOwnerChange={planetOwnerChange}
          onClose={() => setActiveDesignation(null)}
        />
      )}
    </section>
  )
}
