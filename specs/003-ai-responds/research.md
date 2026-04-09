# Research: AI Responds

## Go WebSocket Library

- **Decision**: Use `github.com/coder/websocket` (formerly nhooyr.io/websocket)
- **Rationale**: Modern API with native `context.Context` support, safe concurrent writes, actively maintained under the Coder org. Cleaner than gorilla/websocket which requires manual write mutex management.
- **Alternatives considered**: gorilla/websocket (archived then unarchived, manual mutex), stdlib (no WebSocket frame support)
- **ADR**: This warrants an ADR — new external dependency for core communication

## Anthropic Go SDK

- **Decision**: Use `github.com/anthropics/anthropic-sdk-go` (official SDK)
- **Rationale**: Official SDK with streaming support via Messages API. Use `client.Messages.New()` with streaming to get `ContentBlockDelta` events.
- **Alternatives considered**: Raw HTTP SSE client (more code, no type safety), third-party SDKs (unnecessary when official exists)

## Claude Model Selection

- **Decision**: Default to `claude-sonnet-4-5`, configurable via `CLAUDE_MODEL` environment variable
- **Rationale**: Best balance of quality and speed for real-time architectural reasoning. Haiku is too shallow for topology analysis. Opus is overkill for streaming conversation.
- **Alternatives considered**: claude-haiku-4-5 (faster but insufficient reasoning quality), claude-opus-4 (slower, unnecessary)

## WebSocket Message Format

- **Decision**: Typed JSON envelope with discriminated `type` field and `json.RawMessage` payload
- **Rationale**: Allows deferred deserialization; frontend and backend share the same message type vocabulary
- **Message types**: Client→Server: `analyze_request`. Server→Client: `ai_chunk`, `ai_done`, `error`

## Graph-to-Prompt Strategy

- **Decision**: Hybrid format — pre-computed topology summary (natural language) + JSON appendix
- **Rationale**: Pure JSON forces the LLM to do graph traversal in-context (unreliable). Natural language summary lets the LLM reason directly while JSON appendix provides precision for referencing specific components.
- **Pre-computed topology analysis** (in Go `graph/analyzer.go`):
  - Fan-in/fan-out per node
  - Entry points (zero in-edges) and leaf nodes (zero out-edges)
  - Single points of failure (nodes whose removal disconnects subgraphs)
  - Connected components (disconnected subgraphs)
  - Cycles (circular dependencies)
  - Edge protocol distribution (HTTP vs async)
  - Paths from entry to data stores
- **Prompt structure**: System prompt (collaborative tone) + topology summary + JSON appendix

## System Prompt Design

- **Decision**: Collaborative architect persona — asks questions, names tradeoffs, references nodes by name
- **Rationale**: Per constitution principle I (Collaborator, Not Judge). The AI should say "have you considered..." not "this is wrong because..."
- **Key instructions**: Reference nodes by name (not ID), ground every observation in topology, suggest alternatives alongside concerns

## React WebSocket Hook

- **Decision**: Custom `useWebSocket` hook using native WebSocket API with exponential backoff reconnect
- **Rationale**: No library needed for single-connection app. Native API is sufficient. Custom hook provides typed messages and connection status.
- **Reconnect parameters**: Initial delay 1s, max delay 30s, multiplier 2x, jitter ±20%
- **Connection status**: Discriminated union: `connecting | connected | disconnected | reconnecting`

## Streaming Display

- **Decision**: Accumulate chunks in `useRef`, flush to state on `requestAnimationFrame` throttle
- **Rationale**: Calling setState on every chunk (potentially 10+/second) causes excessive re-renders. RAF throttle limits to ~60 renders/sec.
- **Pattern**: Buffer in ref → flush on RAF → final flush on `ai_done` message

## Frontend Chat Panel

- **Decision**: Right side panel, conversation-style layout, auto-scroll on new content
- **Rationale**: Standard pattern for AI assistant panels (GitHub Copilot, Cursor). Right side keeps canvas as dominant workspace with palette on left.
