# Quickstart: AI Interface Abuse Hardening

**Branch**: `008-ai-abuse-hardening` | **Date**: 2026-04-09

## What This Feature Does

Adds five abuse-prevention gates to the AI interface, all enforced server-side before any LLM call:

1. **Rate limiting** — 10 AI requests per 2-minute window per IP
2. **Diagram required** — Rejects requests with empty canvas
3. **Node count cap** — Rejects diagrams with >50 nodes
4. **Turn limit** — 20 round-trip exchanges per session, with countdown at 5 remaining
5. **Topic constraint** — System prompt instructs AI to stay on architecture topics

## Key Files to Modify

| File | Change |
|------|--------|
| `backend/internal/ws/handler.go` | Add validation pipeline before LLM call, turn tracking, abuse logging |
| `backend/internal/ws/message.go` | Add `validation_error` message type and payload struct |
| `backend/internal/llm/prompt.go` | Add topic-constraint language to system prompt |
| `backend/internal/llm/conversation.go` | Add turn count fields and methods |
| `frontend/src/App.tsx` | Handle `validation_error` messages |
| `frontend/src/components/ChatPanel/ChatPanel.tsx` | Display remaining turns indicator |
| `frontend/src/types/websocket.ts` | Add validation error types |

## New Files to Create

| File | Purpose |
|------|---------|
| `backend/internal/ratelimit/limiter.go` | In-memory sliding window rate limiter |
| `backend/internal/ratelimit/limiter_test.go` | Table-driven tests |
| `backend/internal/ipaddr/extract.go` | Client IP extraction from X-Forwarded-For / RemoteAddr |
| `backend/internal/ipaddr/extract_test.go` | Tests for IP extraction |

## Implementation Order

1. **IP extraction** (`ipaddr` package) — no dependencies, fully testable in isolation
2. **Rate limiter** (`ratelimit` package) — depends on nothing, fully testable in isolation
3. **Turn counting** (extend `ConversationManager`) — small change, testable in isolation
4. **Validation pipeline** (in `handler.go`) — wires up all checks, depends on 1-3
5. **System prompt update** (`prompt.go`) — standalone text change
6. **Frontend error handling** — display validation errors and turn countdown
7. **Nginx proxy header** — verify/add `X-Forwarded-For` to WebSocket proxy config
8. **Abuse logging** — add slog calls to validation pipeline

## Testing Strategy

- **Unit tests**: Rate limiter (concurrency, window expiry, boundary conditions), IP extraction (with/without proxy headers, multiple entries), turn counting (increment, limit, notification threshold)
- **Integration tests**: Full validation pipeline via WebSocket — send messages that trigger each gate, verify correct error code and message returned
- **Manual tests**: Deploy locally, verify legitimate flow works, then test each gate by triggering the condition

## Configuration Values

| Parameter | Value | Location |
|-----------|-------|----------|
| Max nodes | 50 | Constant in handler |
| Rate limit requests | 10 | Constant in rate limiter |
| Rate limit window | 2 minutes | Constant in rate limiter |
| Max turns | 20 | Constant in conversation manager |
| Turn notification threshold | 5 remaining | Constant in handler |
