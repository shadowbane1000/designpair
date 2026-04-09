# Tasks: Deployable Skeleton

**Input**: Design documents from `/specs/004-deployable-skeleton/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Conversation management tests (sliding window, context budget). Updated Playwright E2E for freeform input and multi-turn conversation.

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

**Purpose**: Shared infrastructure changes needed by all user stories

- [x] T001 Update WebSocket message types in `backend/internal/ws/message.go` — add `ChatMessagePayload` with `Text` string and `GraphState` fields per contracts/chat-message.md
- [x] T002 [P] Update frontend WebSocket URL in `frontend/src/App.tsx` — replace hardcoded `ws://localhost:8081/ws` with relative URL derived from `window.location` (`wss://` for HTTPS, `ws://` for HTTP, same host)
- [x] T003 [P] Add Vite proxy config in `frontend/vite.config.ts` — proxy `/ws` and `/health` to `http://localhost:8081` so relative URLs work during development

**Checkpoint**: Message types compile. Frontend connects to backend via relative URL in both dev and production.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Conversation management infrastructure

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Create conversation manager in `backend/internal/llm/conversation.go` — `ConversationManager` struct with `AddUserTurn(text)`, `AddAssistantTurn(text)`, `BuildMessages()` methods. Implements sliding window: drops oldest turn pairs when estimated tokens exceed budget (~120K). Token estimation at ~4 chars/token.
- [x] T005 Write conversation manager tests in `backend/internal/llm/conversation_test.go` — test cases: empty history, single turn, multi-turn assembly, sliding window truncation when over budget, turn pair integrity (always drops user+assistant together), empty text maps to default prompt

**Checkpoint**: `go test ./internal/llm/...` passes. Conversation manager correctly assembles and truncates history.

---

## Phase 3: User Story 1 — Multi-Turn Conversation (Priority: P1)

**Goal**: User types freeform questions, AI responds with awareness of full conversation and current diagram

**Independent Test**: Build a diagram. Submit empty input (default analysis). Type a follow-up question. AI response shows awareness of both the diagram and the previous exchange.

### Implementation for User Story 1

- [x] T006 [US1] Update WebSocket handler in `backend/internal/ws/handler.go` — handle `chat_message` type: extract text + graphState, add user turn to conversation manager, build prompt with system prompt + graph analysis + conversation history, stream AI response, add assistant turn after completion. Keep backwards compatibility with `analyze_request` (treat as empty-text chat_message).
- [x] T007 [US1] Update LLM client interface in `backend/internal/llm/client.go` — extend `StreamAnalysis` to accept conversation turns as a generic type (not SDK-specific `anthropic.MessageParam`). The Anthropic implementation converts internally. Keep SDK types out of the interface.
- [x] T008 [US1] Update LLM client tests in `backend/internal/llm/client_test.go` — update mock to verify conversation history is passed through correctly
- [x] T009 [US1] Replace "Ask AI" button with text input in `frontend/src/components/ChatPanel/ChatPanel.tsx` — add input field at bottom of chat panel with send button, `data-testid="chat-input"` on input and `data-testid="chat-send"` on button. Disabled while streaming. Enter submits.
- [x] T010 [US1] Update `frontend/src/App.tsx` — remove Ask AI button from header, wire chat input to send `chat_message` (with text + current graph state). Empty/whitespace submission substitutes "Analyze my architecture" as both the display text and the payload text (default prompt lives only in the frontend).
- [x] T011 [US1] Update chat message display — show user's actual typed text (or "Analyze my architecture" for empty submissions) in the user message bubble

**Checkpoint**: Multi-turn conversation works. Follow-up questions show AI awareness of previous context. Empty submit triggers default analysis.

---

## Phase 4: User Story 2 — Deploy to Public URL (Priority: P1)

**Goal**: Application is live at `designpair.colberts.us` with HTTPS, auto-deployed from CI

**Independent Test**: Navigate to `https://designpair.colberts.us`. Build a diagram, have a multi-turn conversation. Everything works.

### Implementation for User Story 2

- [x] T012 [US2] Create frontend nginx config in `docker/frontend-nginx.conf` — serves static files from `/usr/share/nginx/html`, proxies `/ws` to `backend:8081` with WebSocket upgrade headers, proxies `/health` to `backend:8081`
- [x] T013 [US2] Update frontend Dockerfile in `frontend/Dockerfile` — copy the custom nginx config into the image (replace default nginx.conf)
- [x] T014 [US2] Create production Docker Compose in `docker-compose.yml` — two services: `frontend` (publishes `127.0.0.1:8083:80`, mounts no volumes) and `backend` (exposes `8081` internally, `env_file: .env`). Shared network. Health check on frontend via backend `/health` proxied through.
- [x] T015 [US2] Update CI pipeline in `.gitea/workflows/ci.yaml` — add `deploy-app` job after `lint-test-build`: build both Docker images, `docker save` both into one tarball, scp to server, stop app, load images, `docker compose up -d`, health check at `localhost:8083`
- [x] T016 [US2] Set up server infrastructure via SSH — create `~/designpair/` directory on server, copy `.env` with `ANTHROPIC_API_KEY`, create nginx config at `/etc/nginx/conf.d/designpair.conf` proxying to `localhost:8083` with WebSocket upgrade headers, obtain TLS cert via certbot (DNS already configured)
- [x] T017 [US2] Update `README.md` — add live demo link to `designpair.colberts.us`, update setup instructions

**Checkpoint**: `https://designpair.colberts.us` loads the application. Full workflow works. CI deploys on merge to main.

---

## Phase 5: User Story 3 — Conversation History (Priority: P2)

**Goal**: Scrollable conversation history within a session, AI receives full context

**Independent Test**: Have a 5+ turn conversation. Scroll up to see all messages. Refresh page — history clears.

### Implementation for User Story 3

- [x] T018 [US3] Verify conversation history works end-to-end — this is largely implemented by T004-T011 (conversation manager + chat panel). Verify: 5+ turn conversation maintains context, scroll shows all messages, page refresh clears history.
- [x] T019 [US3] Add character count indicator to chat input in `frontend/src/components/ChatPanel/ChatPanel.tsx` — show count when approaching 2000 character limit, prevent submission over limit. Add `data-testid="char-count"`

**Checkpoint**: Multi-turn conversation with full history. Character limit enforced. Page refresh clears state.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Error handling, cleanup, and validation

- [x] T020 [P] Update existing Playwright E2E tests in `frontend/e2e/drag-and-connect.spec.ts` and `frontend/e2e/ai-responds.spec.ts` — replace `ask-ai-button` references with `chat-input` + Enter key submission
- [x] T021 [P] Clean up unused Ask AI button code — remove button from Canvas.tsx header, remove `handleAskAI` logic that moved to chat input
- [x] T022 Run full lint and test suite — `make lint && make test`, fix any issues
- [x] T023 Run quickstart validation — follow `specs/004-deployable-skeleton/quickstart.md` locally and at the public URL

---

## Phase 7: E2E Testing (Playwright)

**Purpose**: Automated tests for multi-turn conversation and deployment

- [x] T024 Write E2E test in `frontend/e2e/conversation.spec.ts` — test multi-turn: submit empty input (default analysis) → wait for response → type follow-up question → submit → verify AI response references previous context → verify all messages visible in chat panel
- [x] T025 Write E2E test for input behavior in `frontend/e2e/conversation.spec.ts` — verify: input disabled while streaming, Enter submits, character count shows near limit
- [x] T026 Verify all Playwright tests pass — `make e2e`, confirm green (requires ANTHROPIC_API_KEY)

**Checkpoint**: All E2E tests pass including multi-turn conversation flow.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup (needs message types)
- **User Stories (Phase 3+)**:
  - US1 (Conversation) depends on Foundational
  - US2 (Deploy) can start after Setup (independent of conversation features for infrastructure, but needs US1 complete for full deploy)
  - US3 (History) depends on US1 (conversation manager must work first)
- **Polish (Phase 6)**: Depends on US1 and US2
- **E2E (Phase 7)**: Depends on Polish

### Parallel Opportunities

- T002, T003 can run in parallel (Setup — different files)
- T012, T013, T014 can run in parallel within US2 (different files)
- T020, T021 can run in parallel (Polish — different files)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (conversation manager)
3. Complete Phase 3: US1 (freeform input + multi-turn)
4. **STOP and VALIDATE**: Have a multi-turn conversation locally

### Incremental Delivery

1. Setup + Foundational → conversation infrastructure ready
2. US1 → Freeform input replaces Ask AI, multi-turn works locally
3. US2 → Deployed to designpair.colberts.us
4. US3 → History verified, character limit added
5. Polish → E2E tests updated, cleanup
6. E2E → Multi-turn conversation tests pass

---

## ADR Handling During Implementation

- **NEVER edit the body** of an existing ADR during task implementation
- If a task requires changing a previously recorded decision, **create a new superseding ADR**

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- DNS for `designpair.colberts.us` is already configured (user confirmed)
- ANTHROPIC_API_KEY must be set for E2E tests and deployment
- The `analyze_request` message type from M3 must continue to work for backwards compatibility
