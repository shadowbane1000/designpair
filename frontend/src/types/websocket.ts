import type { GraphState } from './graph'

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

// Server → Client
export interface AIChunkPayload {
  requestId: string
  delta: string
}

export interface AIDonePayload {
  requestId: string
}

export interface ErrorPayload {
  requestId?: string
  message: string
}

export type ServerMessage =
  | WSMessage<AIChunkPayload> & { type: 'ai_chunk' }
  | WSMessage<AIDonePayload> & { type: 'ai_done' }
  | WSMessage<ErrorPayload> & { type: 'error' }
