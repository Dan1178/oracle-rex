import { CREDENTIAL_HINT, ErrorState, RETRY_HINT } from '../ErrorState/ErrorState'
import { EmptyHint } from '../EmptyHint/EmptyHint'
import { JobResultView } from '../JobResultView/JobResultView'
import { LoadingState } from '../LoadingState/LoadingState'
import type { UseAiJobResult } from '../../hooks/useAiJob'
import type { FeatureType } from '../../types/ai'

// The shared result-area ladder for an AI job: a credential error, then the
// loading / job-error / success / empty states, in priority order. RulesPanel,
// StrategyPanel, MovePanel, and BattleCalculator all rendered this same branch
// by hand; this collapses it to one component so the states (and their hint
// copy) stay consistent. The credential check is optional because a panel may
// resolve credentials elsewhere (or not need them).

export interface JobResultAreaProps {
  job: UseAiJobResult
  feature: FeatureType
  loadingMessage: string
  /** Re-run the job after a job-level error. */
  onJobRetry: () => void
  /** A pre-job credential failure (no key / access code), if any. */
  credentialError?: string
  /** Retry handler for the credential error (often the same as onJobRetry). */
  onCredentialRetry?: () => void
  /** Placeholder text shown before the first result. Omit to render nothing. */
  emptyHint?: string
}

export function JobResultArea({
  job,
  feature,
  loadingMessage,
  onJobRetry,
  credentialError,
  onCredentialRetry,
  emptyHint,
}: JobResultAreaProps) {
  if (credentialError) {
    return (
      <ErrorState
        message={credentialError}
        onRetry={onCredentialRetry}
        hint={CREDENTIAL_HINT}
      />
    )
  }
  if (job.isLoading) {
    return <LoadingState message={loadingMessage} />
  }
  if (job.phase === 'error' && job.error) {
    return <ErrorState message={job.error} onRetry={onJobRetry} hint={RETRY_HINT} />
  }
  if (job.phase === 'success' && job.result) {
    return <JobResultView feature={feature} result={job.result} />
  }
  return emptyHint ? <EmptyHint>{emptyHint}</EmptyHint> : null
}
