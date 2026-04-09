# Tasks: AI Responds

**Input**: Design documents from `/specs/003-ai-responds/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Graph-to-prompt construction is the most critical code path per constitution Principle IV. Topology analyzer and prompt construction have dedicated tests. WebSocket message handling has tests. Playwright E2E covers the full end-to-end flow.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend**: `frontend/src/` at repository root
- **Backend**: `backend/` at repository root

---

## Phase 1: Setup

**Purpose**: Add new dependencies and shared type definitions

- [x] T001 Add `github.com/coder/websocket` and `github.com/anthropics/anthropic-sdk-go` to `backend/go.mod` via `go get`
- [x] T002 [P] Create WebSocket message types in `backend/internal/ws/message.go` — `WSMessage` envelope with `Type` string, `Payload` json.RawMessage, `RequestID` string; typed payloads: `AnalyzeRequest`, `AIChunk`, `AIDone`, `ErrorPayload` per contracts/websocket-messages.md
- [x] T003 [P] Create frontend WebSocket message types in `frontend/src/types/websocket.ts` — discriminated union: `AnalyzeRequestMessage`, `AIChunkMessage`, `AIDoneMessage`, `ErrorMessage` matching the contract

**Checkpoint**: Dependencies installed. Message types compile on both sides.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core backend infrastructure that all user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Create graph analyzer in `backend/internal/graph/analyzer.go` — `Analyze(graphState)` function that computes TopologyAnalysis: entryPoints, leafNodes, fanIn/fanOut per node, singlePointsOfFailure, cycles, connectedComponents, edgeProtocols, nodesByType
- [x] T005 Write topology analyzer tests in `backend/internal/graph/analyzer_test.go` — table-driven tests: empty graph, linear chain (A→B→C), fan-out (LB→3 services), shared database (3 services→1 DB), cycle detection, disconnected components, single point of failure identification
- [x] T006 [P] Create prompt builder in `backend/internal/graph/prompt.go` — `BuildPrompt(graphState, topologyAnalysis)` function that constructs the hybrid prompt: natural language topology summary + fenced JSON appendix. Omit node positions from the summary (Principle II).
- [x] T007 [P] Write prompt builder tests in `backend/internal/graph/prompt_test.go` — verify: empty graph produces sensible prompt, topology summary references node names (not IDs), JSON appendix is valid, positions are excluded from summary text
- [x] T008 [P] Create system prompt template in `backend/internal/llm/prompt.go` — collaborative architect persona per constitution Principle I: asks questions, suggests alternatives, references nodes by name, grounds observations in topology

**Checkpoint**: `go test ./internal/graph/...` passes. Analyzer correctly identifies topology properties. Prompt builder produces a well-structured prompt.

---

## Phase 3: User Story 1 — Ask the AI About My Architecture (Priority: P1)

**Goal**: User clicks "Ask AI", graph state is sent to the backend, which constructs a prompt, calls Anthropic, and streams the response back

**Independent Test**: Build a diagram (LB → Service → DB). Click "Ask AI". A streaming response appears in the chat panel referencing specific components.

### Implementation for User Story 1

- [x] T009 [US1] Create LLM client interface and Anthropic implementation in `backend/internal/llm/client.go` — interface `Client` with `StreamAnalysis(ctx, systemPrompt, userPrompt) (chan string, chan error)` method; Anthropic implementation using `anthropic-sdk-go` with streaming, reading `ANTHROPIC_API_KEY` and `CLAUDE_MODEL` env vars
- [x] T010 [US1] Write LLM client tests in `backend/internal/llm/client_test.go` — test with a mock implementation that verifies the interface contract: streaming chunks arrive on the channel, done signal closes the channel, errors propagate
- [x] T011 [US1] Create WebSocket handler in `backend/internal/ws/handler.go` — `HandleWebSocket(llmClient, graphAnalyzer)` that accepts WebSocket upgrade, reads `analyze_request` messages, runs graph analysis + prompt construction, calls LLM client, and relays `ai_chunk`/`ai_done`/`error` messages back
- [x] T012 [US1] Write WebSocket handler tests in `backend/internal/ws/handler_test.go` — test message routing: valid analyze_request triggers LLM call, malformed message returns error, ai_chunk messages are forwarded correctly
- [x] T013 [US1] Wire up WebSocket endpoint in `backend/internal/server/server.go` — add `GET /ws` route that delegates to the WebSocket handler; add CORS headers for frontend dev server origin
- [x] T014 [US1] Update `backend/cmd/designpair/main.go` — initialize LLM client with env config, pass to server setup

**Checkpoint**: `go test ./...` passes. Backend accepts WebSocket connection, receives graph state, calls Anthropic, streams response.

---

## Phase 4: User Story 2 — Real-Time Communication (Priority: P1)

**Goal**: Frontend establishes WebSocket connection with auto-reconnect and status indicator

**Independent Test**: Open the app — "connected" indicator shows. Kill backend — "disconnected" shows, "Ask AI" disabled. Restart backend — reconnects automatically.

### Implementation for User Story 2

- [x] T015 [US2] Create `useWebSocket` hook in `frontend/src/hooks/useWebSocket.ts` — native WebSocket API, typed message send/receive, connection status state (`connecting | connected | disconnected | reconnecting`), exponential backoff reconnect (1s initial, 30s max, 2x multiplier, ±20% jitter), auto-reconnect on close/error. Add `data-testid` on status indicator elements.
- [x] T016 [US2] Create ConnectionStatus component in `frontend/src/components/ConnectionStatus/ConnectionStatus.tsx` — displays current connection state with `data-testid="connection-status"`, visual indicator (green dot/red dot/spinner)
- [x] T017 [P] [US2] Create ConnectionStatus styles in `frontend/src/components/ConnectionStatus/ConnectionStatus.css`
- [x] T018 [US2] Update `frontend/src/App.tsx` — integrate `useWebSocket` hook, pass connection status and send function to child components, add ConnectionStatus to the layout header
- [x] T019 [US2] Add "Ask AI" button to the canvas toolbar area in `frontend/src/components/Canvas/Canvas.tsx` — disabled when disconnected or while AI is streaming, sends `analyze_request` with current graph state on click. Add `data-testid="ask-ai-button"`

**Checkpoint**: App shows connection status. "Ask AI" button sends graph state. Button disabled when disconnected.

---

## Phase 5: User Story 3 — View the AI Chat Panel (Priority: P2)

**Goal**: Chat panel on the right side displays streaming AI responses

**Independent Test**: Click "Ask AI" — response streams into chat panel word by word. Panel auto-scrolls. Streaming indicator visible during response.

### Implementation for User Story 3

- [x] T020 [US3] Create ChatPanel component in `frontend/src/components/ChatPanel/ChatPanel.tsx` — right side panel, conversation-style layout, renders list of ChatMessage objects, auto-scrolls to bottom on new content, streaming indicator (pulsing dots) when AI is responding. Add `data-testid="chat-panel"`, `data-testid="chat-message-{id}"`, `data-testid="streaming-indicator"`
- [x] T021 [P] [US3] Create ChatPanel styles in `frontend/src/components/ChatPanel/ChatPanel.css` — conversation bubbles, streaming animation, monospace for any code blocks, scroll container
- [x] T022 [US3] Create chat state management — add `messages: ChatMessage[]` state and `isStreaming` flag to App or a custom hook. On `ai_chunk`: append delta to current message content (RAF-throttled). On `ai_done`: mark message complete. On `error`: show error message in chat.
- [x] T023 [US3] Update `frontend/src/App.tsx` layout — final layout: Palette (left) | Canvas (center) | ChatPanel (right). Wire ChatPanel to chat state and WebSocket message handlers. Handle `ai_chunk`, `ai_done`, `error` messages from WebSocket.
- [x] T024 [US3] Display user action in chat — when "Ask AI" is clicked, add a "user" message to the chat (e.g., "Analyze my architecture") before the AI response starts streaming

**Checkpoint**: Full end-to-end works. Draw diagram → Ask AI → streaming response in chat panel.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Error handling, visual polish, and validation

- [x] T025 [P] Handle error states in chat panel — API errors display as user-friendly messages in chat (not raw errors), connection loss during streaming shows error message
- [x] T026 [P] Handle empty canvas — when "Ask AI" is clicked with no nodes, the AI responds appropriately (the prompt handles this case)
- [x] T027 Run full lint and test suite — `make lint && make test`, fix any issues
- [x] T028 Run quickstart validation — follow `specs/003-ai-responds/quickstart.md` steps end-to-end

---

## Phase 7: E2E Testing (Playwright)

**Purpose**: Automated browser tests for the full AI interaction flow

- [x] T029 Write E2E test in `frontend/e2e/ai-responds.spec.ts` — test flow: open app → verify "connected" status → drag Service and Database onto canvas → connect them → click "Ask AI" → verify streaming indicator appears → verify chat panel shows a response → verify "Ask AI" button re-enables after response completes
- [x] T030 Write E2E test for disconnect handling in `frontend/e2e/ai-responds.spec.ts` — verify "Ask AI" button is disabled when status shows disconnected (requires stopping the backend during test)
- [x] T031 Verify all Playwright tests pass — `make e2e`, confirm green

**Checkpoint**: `make e2e` validates the full AI interaction flow and disconnect handling.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup (needs Go dependencies and message types)
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - US1 (AI Backend) can start after Foundational
  - US2 (WebSocket Frontend) can start after Foundational (independent of US1 for the hook, but integration needs backend)
  - US3 (Chat Panel) depends on US1 and US2 (needs streaming data to display)
- **Polish (Phase 6)**: Depends on all user stories being complete
- **E2E Testing (Phase 7)**: Depends on Polish

### Within Each User Story

- Interface/types before implementation
- Tests alongside implementation (test the critical paths: analyzer, prompt builder, WS handler)
- Backend before frontend integration (US1 before US2 integration)

### Parallel Opportunities

- T002, T003 can run in parallel (Setup — different languages)
- T006, T007, T008 can run in parallel with each other (Foundational — different files)
- T017 can run in parallel with T015/T016 (CSS independent of logic)
- T021 can run in parallel with T020 (CSS independent of logic)
- T025, T026 can run in parallel (Polish — independent concerns)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (deps + types)
2. Complete Phase 2: Foundational (graph analyzer + prompt builder + tests)
3. Complete Phase 3: User Story 1 (LLM client + WebSocket handler)
4. **STOP and VALIDATE**: Use `wscat` or similar to send a graph state JSON and verify streaming AI response

### Incremental Delivery

1. Setup + Foundational → graph analysis and prompt construction working, tested
2. US1 → Backend accepts WebSocket, streams AI responses
3. US2 → Frontend connects, shows status, sends graph state
4. US3 → Chat panel displays streaming responses
5. Polish → Error handling, empty canvas, lint/test
6. E2E → Playwright validates full flow

---

## ADR Handling During Implementation

- **NEVER edit the body** of an existing ADR during task implementation
- If a task requires changing a previously recorded decision, **create a new superseding ADR**
- When a new ADR supersedes an old one, you MAY update the old ADR's **Status** and **Related ADRs** fields only

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- The graph analyzer (T004/T005) and prompt builder (T006/T007) are the most critical tasks — per constitution Principle IV, the quality of the AI's feedback depends on these
- Commit after each task or logical group
- Stop at any checkpoint to validate independently
- ANTHROPIC_API_KEY must be set in the environment for US1 integration testing
