# ADR-007: coder/websocket for Go WebSocket Server

**Status:** Accepted
**Date:** 2026-04-09
**Deciders:** Tyler Colbert

## Context

ADR-004 decided to use WebSocket for real-time communication and noted that the Go WebSocket library choice "may warrant its own ADR." Go's standard library does not include WebSocket frame handling — a third-party package is required. The WebSocket connection is the core communication channel between the React frontend and the Go backend, carrying graph state updates and streaming AI responses.

## Decision

Use `github.com/coder/websocket` (formerly `nhooyr.io/websocket`) as the Go WebSocket library.

## Rationale

- **Modern, context-aware API:** Native `context.Context` support throughout, which means cancellation propagates naturally — if a client disconnects, the context cancels, aborting any in-flight Anthropic API call. This is critical for the streaming relay pattern.
- **Safe concurrent writes:** The library handles write concurrency internally, unlike gorilla/websocket which requires manual mutex management. This simplifies the streaming relay where AI response chunks need to be written as they arrive.
- **Actively maintained:** Maintained under the Coder organization. Consistent releases and responsive to issues.
- **Cleaner API surface:** Fewer footguns than gorilla/websocket. The `Accept`/`Dial` API is more straightforward than gorilla's upgrader pattern.

## Alternatives Considered

- **gorilla/websocket:** The most widely used Go WebSocket library. Was archived in late 2022, then unarchived and moved to a community org. Functional but requires manual write mutex management and doesn't integrate with `context.Context` as naturally. The archival history raises maintenance concerns for a core dependency.
- **Go standard library:** `net/http` can perform the WebSocket upgrade handshake but does not handle the WebSocket frame protocol. Not a viable standalone option.

## Consequences

### Positive
- Context cancellation propagates cleanly through the streaming pipeline (client disconnect → cancel Anthropic stream)
- No manual write mutex needed for concurrent WebSocket writes
- Modern API conventions align with idiomatic Go

### Negative
- Less community documentation and Stack Overflow coverage than gorilla/websocket
- Import path changed from `nhooyr.io/websocket` to `github.com/coder/websocket` — search results may reference the old path
- Smaller user base means edge cases are less battle-tested

### Mitigations
- The library's API is small and well-documented in its README and Go docs
- For the single-user, self-hosted use case, edge cases around high concurrency are unlikely
- The WebSocket message protocol (JSON envelopes) is library-agnostic, so switching libraries later is straightforward

## Related ADRs

- ADR-004: WebSocket for Real-Time AI Communication (this ADR implements the library selection noted in ADR-004's mitigations)
