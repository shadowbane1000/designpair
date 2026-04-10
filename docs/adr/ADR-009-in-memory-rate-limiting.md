# ADR-009: In-Memory Sliding Window Rate Limiting

**Status:** Accepted
**Date:** 2026-04-09
**Deciders:** Tyler Colbert

## Context

DesignPair is deployed publicly with no authentication. Every AI request costs money (Anthropic API usage). Without rate limiting, a single bad actor — or even an enthusiastic user with a fast trigger finger — can generate unbounded API costs in minutes. We need a mechanism to cap the rate of AI requests per client.

The challenge is choosing a rate limiting approach that fits the project's constraints: no persistent storage (ADR-005), single-instance deployment, WebSocket-based communication (ADR-004), and the application sits behind an Nginx reverse proxy that handles the initial HTTP upgrade.

## Decision

Use an in-memory sliding window counter, keyed by client IP, enforced per-message inside the WebSocket handler. The rate limit is 10 AI requests per 2-minute window. Client IP is determined by the rightmost entry in `X-Forwarded-For` (production, behind Nginx) or the direct connection address (local development).

## Rationale

- **Sliding window over fixed window:** A fixed window resets at clock boundaries, allowing a burst of 2x the limit across a boundary (e.g., 10 requests at 1:59 and 10 more at 2:01). The sliding window always looks back from "now," preventing this.
- **In-memory over external store:** ADR-005 established no persistence for v1. Adding Redis or similar for a single rate limit rule would be the first external dependency — disproportionate to the problem. In-memory state resets on server restart, which is acceptable (clears stale blocks after deploys).
- **Per-message over per-connection:** Rate limiting at the WebSocket connection level (Nginx `limit_conn`) doesn't help — a single connection can send unlimited messages. The limit must be enforced inside the handler, per-message.
- **Per-IP over per-session:** A bad actor can open many WebSocket connections (sessions) from the same IP. Per-session limits are trivially bypassed by reconnecting. Per-IP limits aggregate all sessions.
- **Rightmost X-Forwarded-For:** The Nginx proxy appends the real client IP. Trusting the leftmost entry would allow clients to spoof their IP by adding a fake `X-Forwarded-For` header before the proxy.

## Alternatives Considered

- **Token bucket:** More flexible (allows controlled bursts) but more complex to implement correctly. For a demo with a single rate limit rule and no burst-tolerance requirement, the sliding window is simpler and equally effective.
- **Nginx rate limiting (`limit_req`):** Works for HTTP endpoints but cannot inspect WebSocket frames. After the upgrade handshake, Nginx treats the connection as an opaque TCP stream. Rate limiting must happen at the application layer.
- **External rate limiter (Redis):** Production-grade and horizontally scalable, but adds an infrastructure dependency for a single-instance demo. Would be the right choice if DesignPair scaled to multiple backend instances behind a load balancer. Not justified now.
- **No rate limiting (rely on turn limits only):** Turn limits cap per-session cost, but a script can open many sessions. Without rate limiting, per-IP cost is unbounded.

## Consequences

### Positive
- Zero external dependencies — consistent with the project's minimal infrastructure philosophy (ADR-005)
- Simple implementation: a mutex-protected `map[string][]time.Time` with lazy pruning
- Server restart clears all rate limit state — no stale blocks after deploys
- Testable in isolation with deterministic time injection

### Negative
- **Single-instance only.** If the backend scales to multiple instances behind a load balancer, each instance tracks its own rate limits independently. A client could get N × the intended limit by hitting different instances. This is acceptable for the current single-instance Docker Compose deployment.
- **Memory grows with active IPs.** Each active IP stores up to 10 timestamps. Bounded by the window — inactive IPs' entries expire naturally. For a demo with modest traffic, memory is negligible.
- **No persistence across restarts.** A server restart resets all rate limits. An attacker could theoretically time requests around deploys. The risk is negligible for a demo.

### Mitigations
- If multi-instance deployment becomes necessary, supersede this ADR with an external rate limiter (Redis or similar)
- Abuse event logging (IP, event type, timestamp) provides observability even without dashboards — operators can grep logs to detect patterns

## Related ADRs

- ADR-004: WebSocket for Real-Time AI Communication (rate limiting must be per-message, not per-connection, because WebSocket is the transport)
- ADR-005: No Persistence v1 (in-memory rate limiting is consistent with no external storage)
- ADR-003: Anthropic for Collaboration (rate limiting protects the Anthropic API budget)
