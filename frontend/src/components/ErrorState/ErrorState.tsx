import styles from './ErrorState.module.css'

// Error message for a failed/timed-out AI job (or any feature error), with an
// optional retry action and an optional next-steps hint. Messages come from
// useAiJob / the API client; the hint tells the user what to do next (Milestone
// 7), typically "add a key in Settings" or "try a Demo, no key needed".

// Shared next-step copy so every panel points users the same way.
export const CREDENTIAL_HINT =
  'Add your API key in Settings (Live AI Mode), or try a Demo / sample above, no key needed.'
export const RETRY_HINT =
  'You can retry, or load a Demo / sample above (those need no API key).'

export interface ErrorStateProps {
  message: string
  onRetry?: () => void
  /** Next-steps guidance shown beneath the message. */
  hint?: string
}

export function ErrorState({ message, onRetry, hint }: ErrorStateProps) {
  return (
    <div className={styles.root} role="alert">
      {message}
      {hint && <p className={styles.hint}>{hint}</p>}
      {onRetry && (
        <div>
          <button type="button" className={styles.retry} onClick={onRetry}>
            Retry
          </button>
        </div>
      )}
    </div>
  )
}
