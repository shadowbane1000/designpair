import { useCallback, useEffect, useRef, useState } from 'react'
import type { GraphState, GraphDelta } from '../types/graph'
import { computeDelta, isDeltaEmpty } from '../services/graphDelta'

const DEBOUNCE_MS = 30000

export interface AutoAnalyzeResult {
  graphState: GraphState
  delta: GraphDelta
}

interface UseAutoAnalyzeOptions {
  isStreaming: boolean
  onTrigger: (result: AutoAnalyzeResult) => void
}

export function useAutoAnalyze({ isStreaming, onTrigger }: UseAutoAnalyzeOptions) {
  const [enabled, setEnabled] = useState(false)
  const lastSnapshotRef = useRef<GraphState | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const queuedRef = useRef<AutoAnalyzeResult | null>(null)
  const isStreamingRef = useRef(isStreaming)
  const onTriggerRef = useRef(onTrigger)

  useEffect(() => { isStreamingRef.current = isStreaming }, [isStreaming])
  useEffect(() => { onTriggerRef.current = onTrigger }, [onTrigger])

  const cancelPending = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    queuedRef.current = null
  }, [])

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      if (prev) {
        // Turning off: cancel any pending trigger
        cancelPending()
      }
      return !prev
    })
  }, [cancelPending])

  const checkForChanges = useCallback(
    (currentGraphState: GraphState) => {
      // Read enabled from ref to avoid stale closure
      // We can't use state directly in this callback since it may be stale
      // Instead, the caller should gate on `enabled` before calling this
      const delta = computeDelta(lastSnapshotRef.current, currentGraphState)

      if (isDeltaEmpty(delta)) return

      // Clear any existing timer
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
      }

      const result: AutoAnalyzeResult = { graphState: currentGraphState, delta }

      timerRef.current = setTimeout(() => {
        timerRef.current = null
        if (isStreamingRef.current) {
          // Queue for when streaming ends
          queuedRef.current = result
        } else {
          lastSnapshotRef.current = currentGraphState
          onTriggerRef.current(result)
        }
      }, DEBOUNCE_MS)
    },
    [],
  )

  /** Call when streaming ends to flush any queued auto-analysis. */
  const onStreamEnd = useCallback(() => {
    const queued = queuedRef.current
    if (queued) {
      queuedRef.current = null
      lastSnapshotRef.current = queued.graphState
      onTriggerRef.current(queued)
    }
  }, [])

  /** Update the last snapshot after a successful auto-analysis completes. */
  const updateSnapshot = useCallback((snapshot: GraphState) => {
    lastSnapshotRef.current = snapshot
  }, [])

  return {
    enabled,
    toggle,
    checkForChanges,
    cancelPending,
    onStreamEnd,
    updateSnapshot,
  }
}
