import { useId, useState } from 'react'
import { createPortal } from 'react-dom'

import styles from './ResetButton.module.css'

// A "Reset" control that asks for confirmation before clearing a tab. Each panel
// owns its state, so it passes an `onReset` that wipes that state; this component
// only handles the trigger button and the themed confirm dialog. `onReset` runs
// only after the user confirms.

export interface ResetButtonProps {
  onReset: () => void
  /** Phrase naming what gets cleared, e.g. "the calculator". */
  what?: string
}

export function ResetButton({ onReset, what = 'this tab' }: ResetButtonProps) {
  const [open, setOpen] = useState(false)
  const titleId = useId()

  const confirm = () => {
    onReset()
    setOpen(false)
  }

  return (
    <>
      <button type="button" className={styles.reset} onClick={() => setOpen(true)}>
        Reset
      </button>
      {open &&
        // Portal to <body> so the fixed overlay is positioned against the
        // viewport, not the console shell (whose backdrop-filter would otherwise
        // make it a containing block and push the dialog off-screen when scrolled).
        createPortal(
          <div
            className={styles.overlay}
            role="presentation"
            onClick={() => setOpen(false)}
          >
            <div
              className={styles.dialog}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 id={titleId} className={styles.title}>
                Reset {what}?
              </h3>
              <p className={styles.message}>
                This clears {what} back to its empty state. It can&rsquo;t be undone.
              </p>
              <div className={styles.actions}>
                {/* autoFocus moves focus into the dialog so it's immediately
                    apparent; Cancel is the safe default for a destructive action. */}
                <button
                  type="button"
                  className={styles.cancel}
                  onClick={() => setOpen(false)}
                  autoFocus
                >
                  Cancel
                </button>
                <button type="button" className={styles.confirm} onClick={confirm}>
                  Reset
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
