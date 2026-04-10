# Data Model: AI Interface Abuse Hardening

**Branch**: `008-ai-abuse-hardening` | **Date**: 2026-04-09

## Entities

### RateLimitEntry

Tracks AI request timestamps per client IP for sliding window rate limiting.

| Field | Type | Description |
|-------|------|-------------|
| IP | string | Client IP address (key) |
| Timestamps | list of timestamps | Timestamps of AI requests within the current window |

**Lifecycle**:
- Created on first AI request from an IP
- Updated (timestamp appended) on each subsequent AI request
- Expired timestamps pruned on each access (lazy cleanup)
- All entries lost on server restart (in-memory only, per ADR-005)

**Validation rules**:
- IP must be non-empty
- Timestamps list length checked against configured max (10 per 2-minute window)

**Concurrency**: Must be safe for concurrent access — multiple WebSocket connections from the same IP may check/update simultaneously. Requires mutex or sync.Map.

---

### Session (extended)

The existing WebSocket connection already acts as an implicit session (one `ConversationManager` per connection in `handler.go:41`). This feature extends it with turn tracking.

| Field | Type | Description |
|-------|------|-------------|
| TurnCount | integer | Number of completed turns (user message + AI response pairs) |
| MaxTurns | integer | Configured turn limit (20) |

**Lifecycle**:
- TurnCount starts at 0 when WebSocket connection is established
- Incremented by 1 after each AI response completes (on `ai_done`)
- Reset to 0 on page refresh (new WebSocket connection = new session)

**Validation rules**:
- TurnCount must be < MaxTurns before accepting a new AI request
- Notification threshold: when MaxTurns - TurnCount <= 5, include remaining count in response

**Note**: Turn counting lives on the existing `ConversationManager` — no new struct needed. Add `turnCount int` and `maxTurns int` fields.

---

### Validation Error (message type)

New WebSocket message type for pre-AI validation failures.

| Field | Type | Description |
|-------|------|-------------|
| RequestID | string | Echoed from the client's request for correlation |
| Code | string | Machine-readable error code (e.g., `rate_limited`, `no_diagram`, `too_many_nodes`, `turn_limit`) |
| Message | string | Human-readable error message for display in chat |
| RetryAfter | integer (optional) | Seconds until retry is allowed (rate limit only) |
| TurnsRemaining | integer (optional) | Remaining turns (turn limit only) |

## Relationships

```
Client IP (1) ──── (1) RateLimitEntry
     │
     └── (many) WebSocket Connections
                    │
                    └── (1) Session/ConversationManager
                              │
                              └── turnCount, maxTurns
```

- One RateLimitEntry per IP, shared across all connections from that IP
- One Session (ConversationManager) per WebSocket connection, independent of other connections
- Rate limiting is cross-session (per IP); turn limiting is per-session (per connection)

## State Transitions

### Rate Limit State (per IP)

```
[No Entry] ──request──> [Under Limit] ──request──> [Under Limit]
                              │                          │
                              └──window fills──> [Rate Limited]
                                                      │
                                          ──oldest expires──> [Under Limit]
```

### Turn Count State (per session)

```
[0 turns] ──exchange──> [1..14 turns] ──exchange──> [15 turns: notify]
                                                         │
                                              ──exchange──> [16..19 turns: notify each]
                                                                    │
                                                         ──exchange──> [20 turns: blocked]
```
