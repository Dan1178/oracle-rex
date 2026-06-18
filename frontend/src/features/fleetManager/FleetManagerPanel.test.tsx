import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createQueryClient } from '../../providers/queryClient'
import { sampleGame } from '../../test/fixtures'
import { server } from '../../test/server'
import type { Game } from '../../types/game'
import { FleetManagerPanel } from './FleetManagerPanel'

function renderPanel(onExport?: (game: Game) => void) {
  const client = createQueryClient()
  return render(
    <QueryClientProvider client={client}>
      <FleetManagerPanel onExport={onExport} />
    </QueryClientProvider>,
  )
}

// sampleGame places a system (Mecatol Rex, one planet, no fleet) at hex 0-0.
async function generateBoard() {
  fireEvent.change(screen.getByLabelText('TTS string'), { target: { value: '78 40 42' } })
  fireEvent.click(screen.getByRole('button', { name: /^generate$/i }))
  // Hexes become clickable buttons only once the board has built.
  return waitFor(() => screen.getByRole('button', { name: '0-0' }))
}

describe('FleetManagerPanel', () => {
  beforeEach(() => {
    server.use(
      http.post('/api/build-game-from-tts/', () => HttpResponse.json({ game: sampleGame })),
    )
  })

  it('builds a board, opens the fleet popover for a system hex, and edits a ship count', async () => {
    renderPanel()
    const hex = await generateBoard()

    // No popover until a system hex is clicked.
    expect(screen.queryByRole('dialog', { name: /fleet management/i })).not.toBeInTheDocument()

    fireEvent.click(hex)
    expect(screen.getByRole('dialog', { name: /fleet management/i })).toBeInTheDocument()
    expect(screen.getByText('Mecatol Rex')).toBeInTheDocument()

    // Increment the (initially zero) fighter count.
    expect(screen.getByLabelText('Fighter count')).toHaveTextContent('0')
    fireEvent.click(screen.getByRole('button', { name: /increase fighter/i }))
    expect(screen.getByLabelText('Fighter count')).toHaveTextContent('1')

    // Close dismisses the popover.
    fireEvent.click(screen.getByRole('button', { name: /^close$/i }))
    expect(screen.queryByRole('dialog', { name: /fleet management/i })).not.toBeInTheDocument()
  })

  it('exports the current board to the Move Suggester', async () => {
    const onExport = vi.fn()
    renderPanel(onExport)

    const exportButton = screen.getByRole('button', { name: /export to move suggester/i })
    expect(exportButton).toBeDisabled()

    await generateBoard()
    expect(exportButton).toBeEnabled()

    fireEvent.click(exportButton)
    expect(onExport).toHaveBeenCalledTimes(1)
    expect(onExport.mock.calls[0][0]).toMatchObject({ name: 'strategy' })
    expect(screen.getByText(/exported to the move suggester/i)).toBeInTheDocument()
  })

  it('keeps edits scoped to the clicked system', async () => {
    renderPanel()
    const hex = await generateBoard()
    fireEvent.click(hex)

    // Add a PDS to the planet (a structure) and infantry (a unit).
    fireEvent.click(screen.getByRole('button', { name: /increase mecatol rex pds/i }))
    fireEvent.click(screen.getByRole('button', { name: /increase mecatol rex infantry/i }))
    expect(screen.getByLabelText('Mecatol Rex PDS count')).toHaveTextContent('1')
    expect(screen.getByLabelText('Mecatol Rex Infantry count')).toHaveTextContent('1')
  })
})
