# Tasks: AI Proactivity

**Input**: Design documents from `/specs/009-ai-proactivity/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Types and utilities needed by all user stories

- [ ] T001 [P] [US1] Add `GraphDelta` type to `frontend/src/types/graph.ts`
- [ ] T002 [P] [US1] Add `auto_analyze_request` message types and `AutoAnalyzePayload` to `frontend/src/types/websocket.ts`
- [ ] T003 [P] [US1] Add `AutoAnalyzePayload` and `GraphDelta` types to `backend/internal/ws/message.go`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Graph delta computation -- needed by all user stories

- [ ] T004 [US1] Create `frontend/src/services/graphDelta.ts` with `computeDelta(previous: GraphState | null, current: GraphState): GraphDelta` function. Compare nodes by ID, edges by ID. Detect added, removed, and modified items. Return empty delta if previous is null (first analysis).
- [ ] T005 [US1] Create `frontend/src/services/__tests__/graphDelta.test.ts` with tests: empty-to-graph (all adds), node addition, node removal, edge addition, edge removal, node rename (modification), edge protocol change (modification), no-change returns empty delta, position-only change returns empty delta.

**Checkpoint**: Delta computation is tested and working. User story work can begin.

---

## Phase 3: User Story 1 - Auto-Analyze Toggle (Priority: P1)

**Goal**: User can toggle auto-analyze on/off. When on, structural changes trigger AI analysis. When off, no automatic analysis.

**Independent Test**: Toggle on. Add a node. AI responds automatically. Toggle off. Add another node. No AI response.

### Tests for User Story 1

- [ ] T006 [P] [US1] Create `frontend/src/hooks/__tests__/useAutoAnalyze.test.ts` with tests: default state is disabled, toggling enables/disables, structural change triggers debounced callback when enabled, no trigger when disabled, toggle off cancels pending timer.

### Implementation for User Story 1

- [ ] T007 [US1] Create `frontend/src/hooks/useAutoAnalyze.ts` hook with: `enabled` state (default false), `toggle()` function, `lastSnapshot` ref, debounce timer ref, `checkForChanges(currentGraphState)` function that compares against lastSnapshot using `computeDelta`, fires callback if delta is non-empty after 2-second debounce. Returns `{ enabled, toggle, checkForChanges, cancelPending }`.
- [ ] T008 [US1] Add auto-analyze toggle UI to `frontend/src/components/ChatPanel/ChatPanel.tsx`: toggle switch in the header area next to "AI Collaborator" title. Label: "Auto". Style: small toggle switch. Pass `autoAnalyzeEnabled` and `onToggleAutoAnalyze` as new props.
- [ ] T009 [US1] Add toggle CSS to `frontend/src/components/ChatPanel/ChatPanel.css`: `.auto-analyze-toggle` styling for the toggle switch.
- [ ] T010 [US1] Wire up `useAutoAnalyze` in `frontend/src/App.tsx`: call `checkForChanges(graphState.graphState)` in a `useEffect` that depends on `graphState.graphState`. When auto-analyze fires, send `auto_analyze_request` via WebSocket with the current graph state and computed delta. Add "(auto-analysis)" prefix to auto-triggered AI messages.
- [ ] T011 [US1] Add `auto_analyze_request` handler to `backend/internal/ws/handler.go`: parse `AutoAnalyzePayload`, run validation (same as chat_message minus empty text check), build prompt with delta context, stream response using existing infrastructure. Add `isAutoAnalysis` field to `AIDonePayload`.
- [ ] T012 [US1] Add auto-analyze prompt section to `backend/internal/llm/prompt.go`: create `BuildAutoAnalyzePrompt(delta)` function that formats the delta as a human-readable description for the system prompt (e.g., "The user just added: Redis Cache (cache type), connected API -> Redis Cache via TCP"). When delta is nil, use standard full analysis prompt.
- [ ] T013 [US1] Handle `isAutoAnalysis` flag in `frontend/src/App.tsx` `onMessage` handler for `ai_done`: when `isAutoAnalysis` is true, mark the message for auto-analysis display. Show "(auto-analysis)" label in the AI role header.

**Checkpoint**: Auto-analyze toggle works end-to-end. Toggle on, add a node, AI responds. Toggle off, no response.

---

## Phase 4: User Story 2 - Debounced Structural Change Detection (Priority: P1)

**Goal**: Only structural changes trigger analysis. Rapid changes are batched.

**Independent Test**: Enable auto-analyze. Drag a node around -- no trigger. Add node + immediately add edge -- one trigger after both settle.

### Tests for User Story 2

- [ ] T014 [P] [US2] Add tests to `frontend/src/hooks/__tests__/useAutoAnalyze.test.ts`: position-only change does not trigger, rapid structural changes produce single trigger, timer resets on each new change.

### Implementation for User Story 2

- [ ] T015 [US2] Refine structural change detection in `useAutoAnalyze.ts`: the `checkForChanges` function must compare graph states excluding position. Use `computeDelta` which already ignores positions (it compares by node ID/type/name/replicaCount and edge ID/source/target/protocol/direction/syncAsync). Only trigger if delta has at least one non-empty array.
- [ ] T016 [US2] Implement queuing logic in `useAutoAnalyze.ts`: if `isStreaming` is true when debounce fires, set a `queued` flag. When streaming ends (detected via a new `onStreamEnd` callback), fire the queued analysis. If a manual message is sent while a trigger is pending, cancel the pending trigger (expose `cancelPending` and call it from `handleChatSubmit`).

**Checkpoint**: Drag events don't trigger. Rapid changes batch correctly. Queue works with streaming.

---

## Phase 5: User Story 3 - Delta-Based Analysis (Priority: P2)

**Goal**: AI receives context about what changed, not just the full graph.

**Independent Test**: Enable auto-analyze. Add a service + database. AI analyzes full graph. Add a cache. AI specifically comments on the cache addition.

### Tests for User Story 3

- [ ] T017 [P] [US3] Add tests to `backend/internal/llm/prompt_test.go` (or create if not exists): `BuildAutoAnalyzePrompt` with added nodes produces description mentioning added nodes, with removed nodes mentions removal, with nil delta produces full analysis instruction.
- [ ] T018 [P] [US3] Add test to `backend/internal/ws/handler_test.go`: auto_analyze_request with delta is processed correctly.

### Implementation for User Story 3

- [ ] T019 [US3] Update `useAutoAnalyze.ts` to store `lastAnalyzedSnapshot` after each successful analysis (update ref in the `ai_done` handler). Pass the snapshot to `computeDelta` so subsequent analyses get accurate deltas.
- [ ] T020 [US3] Enhance `BuildAutoAnalyzePrompt` in `backend/internal/llm/prompt.go` to produce rich delta descriptions. Format: "Recent changes to the architecture:\n- Added nodes: [list with types]\n- Removed nodes: [list]\n- Added connections: [list with source->target and protocol]\n- Removed connections: [list]\n- Modified: [list with old->new]\n\nPlease comment on these specific changes and their architectural implications. Focus on how they affect the existing architecture rather than re-reviewing unchanged components."
- [ ] T021 [US3] Update `handleAutoAnalyze` in `backend/internal/ws/handler.go` to pass delta to `BuildAutoAnalyzePrompt` and prepend the delta context to the user message before sending to the LLM.

**Checkpoint**: AI's auto-analysis references specific changes. Second analysis doesn't repeat first analysis content.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases and integration testing

- [ ] T022 [P] Update `frontend/src/components/ChatPanel/ChatPanel.css` with auto-analysis message styling: subtle background tint or icon to distinguish auto messages from user-initiated responses.
- [ ] T023 [P] Add auto-analyze to e2e test consideration in `frontend/e2e/` (document test scenario in comments, actual e2e may need mock WebSocket).
- [ ] T024 Update `backend/internal/ws/handler_test.go` to cover auto_analyze_request validation: respects rate limiting, respects turn limit, empty graph rejected.
- [ ] T025 Run `make lint && make test` to validate all changes pass CI.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies -- types can be created immediately
- **Foundational (Phase 2)**: Depends on Phase 1 types
- **US1 Toggle (Phase 3)**: Depends on Phase 2 (needs delta computation)
- **US2 Debounce (Phase 4)**: Depends on Phase 3 (refines the hook created in US1)
- **US3 Delta (Phase 5)**: Depends on Phase 3 (needs working auto-analyze flow). Can partially parallel with US2.
- **Polish (Phase 6)**: Depends on all user stories

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Types before logic
- Frontend hook before UI wiring
- Backend handler before prompt construction
- Integration (App.tsx wiring) last

### Parallel Opportunities

- T001, T002, T003 can all run in parallel (different files)
- T006 and T014 tests can be written in parallel
- T017 and T018 backend tests can be written in parallel
- T022 and T023 polish tasks can run in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Types
2. Complete Phase 2: Delta computation
3. Complete Phase 3: Toggle + basic auto-analyze
4. **STOP and VALIDATE**: Toggle works, AI responds to structural changes
5. This alone delivers the core feature

### Incremental Delivery

1. Types + Delta → Foundation ready
2. Toggle + Auto-analyze → Core feature works (MVP)
3. Debounce refinement → Feature is polished
4. Delta-based analysis → Feature is smart
5. Polish → Feature is production-ready

## Notes

- Auto-analyze does NOT use tool_use -- observational feedback only
- Auto-analyze counts toward existing turn limit
- Toggle state is session-only (per ADR-005)
- The 2-second debounce is hardcoded for this milestone (not user-configurable)
