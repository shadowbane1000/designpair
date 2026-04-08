# ADR-004: WebSocket for Real-Time AI Communication

**Status:** Accepted  
**Date:** 2026-04-08  
**Deciders:** Tyler Colbert

## Context

The AI collaborator needs to respond in real time as the user modifies their diagram. The user experience should feel conversational — the AI streams its thoughts as they're generated, not as a single block after a long pause. This requires bidirectional, low-latency communication between the React frontend and the Go backend.

## Decision

Use WebSocket for all real-time communication between the frontend and backend.

## Rationale

- **Bidirectional communication:** The client sends diagram state changes to the server, and the server streams AI responses back. WebSocket naturally supports this — unlike HTTP, which requires the client to initiate every exchange.
- **Streaming AI responses:** The Go backend receives streaming responses from Anthropic's API (via SSE) and needs to forward token-by-token to the client. WebSocket allows pushing each chunk as it arrives, creating a smooth typing-like effect in the chat panel.
- **Reduced overhead:** A persistent WebSocket connection avoids the overhead of establishing a new HTTP connection for each diagram change or AI interaction. Given that the user may trigger many small updates as they drag and connect components, this matters for responsiveness.
- **Natural fit for the interaction model:** The AI collaborator watches the diagram evolve over time. A persistent connection models this relationship better than request/response — the AI is "present" in the session, not called on demand.

## Alternatives Considered

- **Server-Sent Events (SSE):** Simpler than WebSocket but one-directional (server → client only). The client would still need to make HTTP POST requests to send diagram updates. This split (SSE for responses + HTTP for updates) works but is less elegant and harder to reason about as a single communication model.
- **HTTP Polling:** Simplest to implement but fundamentally wrong for real-time streaming. Introduces latency and wastes resources. Rejected immediately.
- **HTTP long-polling:** A middle ground that's more complex than SSE with no advantages over WebSocket for this use case.

## Consequences

### Positive
- Smooth, real-time streaming of AI responses
- Clean bidirectional communication model
- Low latency for diagram change notifications
- The persistent connection models the "AI is watching" experience well

### Negative
- WebSocket connection management adds backend complexity (handling disconnects, reconnects, connection lifecycle)
- Harder to debug than HTTP request/response
- Load balancers and proxies sometimes handle WebSocket connections differently than HTTP
- Go's standard library WebSocket support requires a third-party package (gorilla/websocket or nhooyr/websocket)

### Mitigations
- Use a well-established Go WebSocket library (evaluate gorilla/websocket vs nhooyr/websocket — this may warrant its own ADR)
- Implement reconnection logic in the frontend with exponential backoff
- Keep the WebSocket message protocol simple and well-documented (JSON messages with a type field)
- For the self-hosted demo, WebSocket handling is straightforward since we control the infrastructure
