import { useCallback, useRef } from 'react'

// Scroll the AI result region into view on demand. The board-driven advisors
// (Strategy, Move) render a tall hex board between the submit button and the
// results, so clicking "Get Strategy" / "Suggest Move" should bring the result
// area into view, the behavior the legacy suggestStrategy had via
// answerBox.scrollIntoView. Returns a ref to attach to the results container and
// a callback to scroll to it.
export function useResultScroll<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null)
  const scrollToResult = useCallback(() => {
    // Defer to the next frame so the scroll runs *after* React commits the
    // click's re-render (the result area switching to its loading state). Calling
    // scrollIntoView synchronously in the click handler races that re-render and
    // can no-op, which is why it behaved inconsistently between panels.
    requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [])
  return { ref, scrollToResult }
}
