import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ResetButton } from './ResetButton'

describe('ResetButton', () => {
  it('asks for confirmation, then resets on confirm', () => {
    const onReset = vi.fn()
    render(<ResetButton onReset={onReset} what="the calculator" />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^reset$/i }))

    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: /^reset$/i }))
    expect(onReset).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('does not reset when cancelled', () => {
    const onReset = vi.fn()
    render(<ResetButton onReset={onReset} what="the calculator" />)
    fireEvent.click(screen.getByRole('button', { name: /^reset$/i }))
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onReset).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
