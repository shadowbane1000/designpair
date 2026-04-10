# Research: AI Interface Abuse Hardening

**Branch**: `008-ai-abuse-hardening` | **Date**: 2026-04-09

## Decision 1: Rate Limit Algorithm

**Decision**: Sliding window counter with per-IP tracking in an in-memory map.

**Rationale**: A sliding window gives smoother behavior than fixed windows (no burst-at-boundary problem). In-memory storage is consistent with ADR-005 (no persistence) and adds zero external dependencies. For a demo application, the rate limiter resetting on server restart is acceptable — it's a feature, not a bug (no stale blocks after deploy).

**Alternatives considered**:
- **Token bucket**: More flexible but more complex to implement; unnecessary for a demo with a single rate limit rule.
- **Fixed window counter**: Simpler but allows burst-at-boundary (user could send 2x limit across a window boundary). Rejected for correctness.
- **External rate limiter (Redis, etc.)**: Adds infrastructure dependency. Overkill for a single-instance demo deployment. Violates ADR-005 spirit.
- **Nginx rate limiting**: Would work for HTTP endpoints but DesignPair uses WebSocket — rate limiting needs to happen per-message within an established connection, not per-connection. Nginx can't inspect WebSocket frames.

## Decision 2: Rate Limit Parameters

**Decision**: 10 AI requests per 2-minute sliding window per IP. Cooldown message shows seconds until the oldest request in the window expires.

**Rationale**: 10 requests per 2 minutes = ~1 request every 12 seconds average. A legitimate user asking questions about their architecture won't hit this. An automated script or rapid clicker will. The 2-minute window is short enough that legitimate users who trigger it accidentally recover quickly.

**Alternatives considered**:
- **5 per minute**: Too aggressive — a user exploring their diagram with rapid follow-up questions could hit this legitimately.
- **20 per minute**: Too permissive — a script could burn through significant AI credits before being throttled.
- **Per-session limits**: Doesn't prevent abuse via multiple sessions from the same IP.

## Decision 3: Conversation Turn Limit

**Decision**: 20 turns (20 user messages + 20 AI responses = 40 total messages). Notify user at 5 remaining turns.

**Rationale**: 20 exchanges is enough for a meaningful demo conversation — an initial analysis, several follow-up questions, and some exploratory "what if" scenarios. The notification at 5 remaining turns gives users time to wrap up their most important questions. Since session = WebSocket connection and page refresh resets, a determined legitimate user can start fresh easily.

**Alternatives considered**:
- **10 turns**: Too restrictive — doesn't allow for a meaningful exploration of a complex diagram.
- **50 turns**: Too permissive — at ~1000-2000 tokens per AI response, 50 turns could consume 50K-100K output tokens per session.
- **No notification**: Poor UX — users would be surprised by sudden cutoff.

## Decision 4: Client IP Extraction Strategy

**Decision**: Check `X-Forwarded-For` header first; if present, use the rightmost (last) IP as the client IP. If absent, fall back to the TCP connection's remote address (`RemoteAddr`).

**Rationale**: The Nginx reverse proxy (configured in `docker/frontend-nginx.conf`) appends the real client IP as the rightmost entry in `X-Forwarded-For`. Trusting only the rightmost entry prevents IP spoofing via client-supplied headers. Falling back to `RemoteAddr` supports local development where no proxy is present.

**Alternatives considered**:
- **Leftmost X-Forwarded-For**: Trivially spoofable by clients adding their own header. Rejected for security.
- **X-Real-IP header**: Nginx-specific; `X-Forwarded-For` is more standard and already set by the existing proxy config.
- **Custom header**: Non-standard; would require proxy config changes with no benefit.

**Implementation note**: The Nginx config at `docker/frontend-nginx.conf` proxies `/ws` to the backend. Need to verify `proxy_set_header X-Forwarded-For` is configured. If not, add it. The WebSocket upgrade path must forward this header.

## Decision 5: System Prompt Topic Constraints

**Decision**: Add explicit topic-boundary instructions to the existing system prompt. The AI should decline non-architecture questions and redirect to the diagram.

**Rationale**: The current system prompt (in `backend/internal/llm/prompt.go`) already defines the collaborative architect role but doesn't explicitly forbid off-topic responses. Adding clear boundaries is the lowest-effort, highest-impact approach. Prompt-based constraints are best-effort — they won't stop determined prompt injection, but they'll deter casual misuse (which is the majority case for a public demo).

**Alternatives considered**:
- **Classifier pre-filter**: Run a separate, cheaper model to classify messages as on/off-topic before sending to the main model. Adds latency, complexity, and cost. Overkill for a demo.
- **Keyword blocklist**: Too brittle; easy to circumvent and produces false positives.
- **No constraint (rely on system prompt role alone)**: The current prompt sets the role but doesn't explicitly decline off-topic requests. Testing shows LLMs will often comply with off-topic requests if the system prompt doesn't explicitly forbid it.

## Decision 6: Validation Order

**Decision**: Validate in this order: (1) rate limit, (2) diagram presence, (3) node count, (4) turn limit, then (5) forward to AI.

**Rationale**: Rate limiting first because it's the cheapest check and the most important abuse gate — a rate-limited user shouldn't consume any server resources beyond the rate check. Diagram checks next because they're simple field checks. Turn limit last (before AI) because it requires looking up session state. This ordering ensures the cheapest checks short-circuit first.

**Alternatives considered**:
- **Turn limit first**: Would require session lookup before rate check. Since rate check is O(1) map lookup vs. session state lookup, rate first is cheaper.
- **All checks in parallel**: No benefit — they're all sub-millisecond and must all pass, so sequential with early return is simpler and equally fast.

## Decision 7: Abuse Event Logging

**Decision**: Use Go's standard `log/slog` structured logger. Log at WARN level with fields: `event` (string enum), `ip` (client IP), `detail` (context-specific, e.g., node count for oversized diagrams).

**Rationale**: `slog` is in the Go standard library (Go 1.21+), requires no external dependency, outputs structured JSON by default which is grep-friendly and parseable. WARN level distinguishes abuse events from normal INFO-level request logging. No dashboards or alerting needed per spec clarification.

**Alternatives considered**:
- **fmt.Printf**: Unstructured, hard to parse programmatically. Rejected.
- **Third-party logger (zerolog, zap)**: Adds dependency for no benefit over slog in this context.
- **Separate log file**: Adds file management complexity. Standard stdout/stderr with Docker log collection is sufficient.
