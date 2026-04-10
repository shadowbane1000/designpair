# Tasks: AI Interface Abuse Hardening

**Input**: Design documents from `/specs/008-ai-abuse-hardening/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/websocket-protocol.md, quickstart.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: No new project initialization needed — project already exists. This phase adds shared types and infrastructure that all validation stories depend on.

- [x] T001 Add `validation_error` message type and `ValidationErrorPayload` struct (with `Code`, `Message`, `RetryAfter`, `TurnsRemaining` fields) to `backend/internal/ws/message.go`
- [x] T002 [P] Add validation error type definitions (`ValidationErrorCode` enum, `ValidationErrorPayload` interface) to `frontend/src/types/websocket.ts`
- [x] T003 [P] Add structured logging import (`log/slog`) and abuse-event helper function to `backend/internal/ws/handler.go` that logs with fields: `event` (string), `ip` (string), `detail` (string)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Frontend validation error handling — all validation stories need the frontend to display `validation_error` messages properly.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T004 Handle `validation_error` WebSocket message type in `frontend/src/App.tsx`: on receipt, display the `message` field as a system error in the chat, remove any streaming indicator, and mark the pending AI message as failed
- [x] T005 Style validation error messages distinctly from normal AI responses in `frontend/src/components/ChatPanel/ChatPanel.tsx` (e.g., warning/error styling for system messages)

**Checkpoint**: Frontend can now display any validation error sent by the backend. All subsequent stories just need to add their server-side check.

---

## Phase 3: User Story 2 — Abusive Rapid-Fire Requests Are Throttled (Priority: P1) MVP

**Goal**: Rate-limit AI requests per client IP using an in-memory sliding window (10 requests / 2 minutes). Correctly determine client IP behind reverse proxy.

**Independent Test**: Send 11 AI requests in rapid succession from the same IP. First 10 succeed; 11th returns `validation_error` with code `rate_limited` and a `retryAfter` value.

### Implementation for User Story 2

- [x] T006 [P] [US2] Create `backend/internal/ipaddr/extract.go`: implement `FromRequest(r *http.Request) string` that returns the rightmost IP from `X-Forwarded-For` header, falling back to `r.RemoteAddr` (strip port). Handle missing header, single-entry header, and multi-entry chain.
- [x] T007 [P] [US2] Create `backend/internal/ipaddr/extract_test.go`: table-driven tests covering: no header (use RemoteAddr), single X-Forwarded-For entry, multiple entries (use rightmost), RemoteAddr with port stripping, IPv6 addresses.
- [x] T008 [P] [US2] Create `backend/internal/ratelimit/limiter.go`: implement `Limiter` struct with `Allow(ip string) (allowed bool, retryAfterSeconds int)` method. Sliding window: track `[]time.Time` per IP in `sync.Mutex`-protected map. Prune expired entries on each call. Constants: `maxRequests = 10`, `window = 2 * time.Minute`.
- [x] T009 [P] [US2] Create `backend/internal/ratelimit/limiter_test.go`: table-driven tests covering: first request allowed, requests up to limit allowed, request at limit+1 rejected with correct retryAfter, expired timestamps pruned and slot reopens, concurrent access from same IP, multiple IPs tracked independently.
- [x] T010 [US2] Wire rate limiter into the application: create `ratelimit.Limiter` in `backend/cmd/designpair/main.go` and pass it to the WebSocket handler. Store client IP (via `ipaddr.FromRequest`) on the WebSocket connection in `backend/internal/ws/handler.go`.
- [x] T011 [US2] Add rate limit check as the FIRST validation gate in the message handler in `backend/internal/ws/handler.go`: before processing `chat_message` or `analyze_request`, call `limiter.Allow(clientIP)`. If rejected, send `validation_error` with code `rate_limited`, human-readable message including retry time, and `retryAfter` field. Log abuse event.
- [x] T012 [US2] Verify `X-Forwarded-For` header is forwarded in WebSocket proxy config at `docker/frontend-nginx.conf`: add `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;` to the `/ws` location block if not already present.

**Checkpoint**: Rate limiting is functional. A single IP cannot exceed 10 AI requests per 2 minutes. Happy path (US1) still works for normal usage patterns.

---

## Phase 4: User Story 4 — Request Without a Diagram Is Rejected (Priority: P2)

**Goal**: Reject AI requests when the canvas is empty (zero nodes), before any AI processing.

**Independent Test**: Send a `chat_message` with an empty `graphState.nodes` array. Receive `validation_error` with code `no_diagram`.

### Implementation for User Story 4

- [x] T013 [US4] Add diagram presence check as the SECOND validation gate (after rate limit) in `backend/internal/ws/handler.go`: if `graphState.Nodes` is nil or empty, send `validation_error` with code `no_diagram` and message explaining a diagram is required. Log abuse event.

**Checkpoint**: Empty-canvas requests are rejected. Existing diagram-based flows still work.

---

## Phase 5: User Story 3 — Oversized Diagram Is Rejected (Priority: P2)

**Goal**: Reject AI requests when the diagram exceeds 50 nodes, before any AI processing.

**Independent Test**: Send a `chat_message` with a `graphState` containing 51 nodes. Receive `validation_error` with code `too_many_nodes`. Send with exactly 50 — succeeds.

### Implementation for User Story 3

- [x] T014 [US3] Add node count check as the THIRD validation gate (after diagram presence) in `backend/internal/ws/handler.go`: if `len(graphState.Nodes) > 50`, send `validation_error` with code `too_many_nodes` and message including actual count and 50-node limit. Log abuse event. Define `maxNodes = 50` as a constant.

**Checkpoint**: Oversized diagrams are rejected. Diagrams at or below 50 nodes still work.

---

## Phase 6: User Story 5 — Off-Topic Questions Are Deflected (Priority: P2)

**Goal**: Constrain the AI to architecture-related topics via system prompt changes.

**Independent Test**: Draw a valid diagram, ask "Write me a poem about cats." AI declines and redirects to architecture. Ask "What are the single points of failure?" AI responds with relevant analysis.

### Implementation for User Story 5

- [x] T015 [US5] Update the `SystemPrompt` constant in `backend/internal/llm/prompt.go`: add explicit topic-boundary instructions after the existing role definition. The AI must: only discuss topics related to the user's architecture diagram (software architecture, system design, infrastructure, data flow, scalability, reliability, security); politely decline off-topic requests and redirect to the diagram; handle borderline questions (e.g., language choice for a service) briefly while steering back to architecture.

**Checkpoint**: Off-topic questions are deflected. Architecture questions still get full responses.

---

## Phase 7: User Story 6 — Conversation Turn Limit Reached (Priority: P3)

**Goal**: Cap conversations at 20 turns (user message + AI response pairs). Notify users when approaching the limit (5 turns remaining). Reset on new session.

**Independent Test**: Send 20 messages with valid diagrams. All succeed, with remaining-turn notices starting at turn 16. Send message 21 — rejected with `turn_limit` error.

### Implementation for User Story 6

- [x] T016 [US6] Add `turnCount int` and `maxTurns int` fields to `ConversationManager` in `backend/internal/llm/conversation.go`. Set `maxTurns = 20` as default. Add methods: `IncrementTurn()`, `TurnsRemaining() int`, `TurnLimitReached() bool`.
- [x] T017 [US6] Add turn limit check as the FOURTH validation gate (after node count) in `backend/internal/ws/handler.go`: if `conversationManager.TurnLimitReached()`, send `validation_error` with code `turn_limit`. Log abuse event.
- [x] T018 [US6] After successful AI response completion (on `ai_done` path) in `backend/internal/ws/handler.go`: call `conversationManager.IncrementTurn()`. If `TurnsRemaining() <= 5`, include `turnsRemaining` field in the `ai_done` payload sent to the client.
- [x] T019 [US6] Update `AIDonePayload` struct in `backend/internal/ws/message.go` to include optional `TurnsRemaining *int` field (pointer for omitempty JSON behavior).
- [x] T020 [US6] Display remaining turns indicator in `frontend/src/components/ChatPanel/ChatPanel.tsx`: when `ai_done` includes `turnsRemaining`, show a subtle notice (e.g., "4 turns remaining"). Use warning styling when ≤3 turns remain.
- [x] T021 [US6] Handle `turnsRemaining` from `ai_done` messages in `frontend/src/App.tsx`: extract the field and pass it to ChatPanel as state.

**Checkpoint**: Conversations are capped at 20 turns. Users see remaining turn count starting at 5 remaining. Page refresh resets the counter.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Verify the full validation pipeline works end-to-end and all stories coexist without conflicts.

- [x] T022 Verify validation gate ordering in `backend/internal/ws/handler.go`: rate limit → diagram presence → node count → turn limit → AI call. Confirm first failing check short-circuits (no subsequent checks run).
- [x] T023 [P] Verify happy path (US1) end-to-end: draw a diagram with <50 nodes, send architecture question, receive AI response. All validation gates pass transparently.
- [x] T024 [P] Verify frontend displays each validation error type distinctly in `frontend/src/components/ChatPanel/ChatPanel.tsx`: rate_limited (with retry time), no_diagram, too_many_nodes, turn_limit.
- [x] T025 Run existing frontend and backend test suites to confirm no regressions: `cd backend && go test ./...` and `cd frontend && npm test`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on T001, T002 from Setup — BLOCKS all user stories
- **US2 Rate Limiting (Phase 3)**: Depends on Foundational — can start after Phase 2
- **US4 No Diagram (Phase 4)**: Depends on Foundational — can start after Phase 2, in parallel with US2
- **US3 Node Count (Phase 5)**: Depends on Foundational — can start after Phase 2, in parallel with US2/US4
- **US5 Off-Topic (Phase 6)**: No dependency on Foundational (prompt-only change) — can start anytime
- **US6 Turn Limit (Phase 7)**: Depends on Foundational — can start after Phase 2, in parallel with US2/US3/US4
- **Polish (Phase 8)**: Depends on all user story phases being complete

### User Story Dependencies

- **US2 (Rate Limiting)**: Independent — new packages, new validation gate
- **US4 (No Diagram)**: Independent — single check in handler
- **US3 (Node Count)**: Independent — single check in handler
- **US5 (Off-Topic)**: Independent — prompt text change only
- **US6 (Turn Limit)**: Independent — extends ConversationManager + new gate

### Within Each User Story

- Backend changes before frontend changes
- Core logic before wiring/integration
- Tests alongside their implementation (T007 with T006, T009 with T008)

### Parallel Opportunities

- T001, T002, T003 can all run in parallel (Phase 1)
- T004 and T005 can run in parallel (Phase 2)
- T006, T007, T008, T009 can all run in parallel (US2 core packages)
- US2, US3, US4, US5, US6 implementation phases can run in parallel after Foundational (they touch different validation gates in handler.go — but note handler.go is shared, so sequential is safer for a single developer)

---

## Parallel Example: User Story 2

```bash
# Launch all independent packages together:
Task: "Create ipaddr/extract.go in backend/internal/ipaddr/extract.go"
Task: "Create ipaddr/extract_test.go in backend/internal/ipaddr/extract_test.go"
Task: "Create ratelimit/limiter.go in backend/internal/ratelimit/limiter.go"
Task: "Create ratelimit/limiter_test.go in backend/internal/ratelimit/limiter_test.go"

# Then sequentially: wire into handler, verify nginx config
```

---

## Implementation Strategy

### MVP First (User Story 2 Only)

1. Complete Phase 1: Setup (shared types)
2. Complete Phase 2: Foundational (frontend error handling)
3. Complete Phase 3: US2 — Rate Limiting
4. **STOP and VALIDATE**: Test rate limiting independently
5. Deploy/demo — the highest-impact cost protection is live

### Incremental Delivery

1. Setup + Foundational → error handling infrastructure ready
2. Add US2 (Rate Limiting) → test → deploy — **biggest cost protection**
3. Add US4 (No Diagram) + US3 (Node Count) → test → deploy — **bounds per-request cost**
4. Add US5 (Off-Topic) → test → deploy — **reduces abuse surface**
5. Add US6 (Turn Limit) → test → deploy — **bounds per-session cost**
6. Polish → verify all gates coexist → final deploy

---

## ADR Handling During Implementation

- **NEVER edit the body** of an existing ADR (Context, Decision, Rationale, Consequences, Alternatives Considered sections) during task implementation
- If a task requires changing a previously recorded decision, **create a new superseding ADR** instead (use the ADR template with the `Supersedes` field)
- When a new ADR supersedes an old one, you MAY update the old ADR's **Status** (e.g., `Superseded by ADR-NNN`) and **Related ADRs** fields only
- This preserves decision history — see Constitution Principle V

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- handler.go is touched by multiple stories (each adds a validation gate). If implementing sequentially, this is fine. If parallel, coordinate to avoid merge conflicts.
- All validation constants (maxNodes=50, maxRequests=10, window=2min, maxTurns=20, notifyThreshold=5) should be named constants, not magic numbers.
- Commit after each phase or logical group of tasks.
