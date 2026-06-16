import styles from './ErrorState.module.css'

// Error message for a failed/timed-out AI job (or any feature error), with an
// optional retry action. Messages come from useAiJob / the API client.

export interface ErrorStateProps {
  message: string
  onRetry?: () => void
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className={styles.root} role="alert">
      {message}
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
