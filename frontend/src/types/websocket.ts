import type { GraphState, GraphDelta } from './graph'

// Envelope
export interface WSMessage<T = unknown> {
  type: string
  payload: T
  requestId?: string
}

// Client → Server
export interface AnalyzeRequestPayload {
  graphState: GraphState
}

// Client → Server
export interface AutoAnalyzeRequestPayload {
  graphState: GraphState
  delta: GraphDelta | null
  pendingSuggestions?: unknown
}

// Server → Client
export interface AIChunkPayload {
  requestId: string
  delta: string
}

export interface AIDonePayload {
  requestId: string
  turnsRemaining?: number
  isAutoAnalysis?: boolean
}

export interface ErrorPayload {
  requestId?: string
  message: string
}

export type ValidationErrorCode =
  | 'rate_limited'
  | 'no_diagram'
  | 'too_many_nodes'
  | 'turn_limit'

export interface ValidationErrorPayload {
  requestId: string
  code: ValidationErrorCode
  message: string
  retryAfter?: number
  turnsRemaining?: number
}

export type ServerMessage =
  | WSMessage<AIChunkPayload> & { type: 'ai_chunk' }
  | WSMessage<AIDonePayload> & { type: 'ai_done' }
  | WSMessage<ErrorPayload> & { type: 'error' }
  | WSMessage<ValidationErrorPayload> & { type: 'validation_error' }
