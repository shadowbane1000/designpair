# Tasks: AI Collaboration Tools

**Input**: Design documents from `/specs/007-ai-collaboration-tools/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Suggestion flattening unit tests. Uniqueness enforcement tests. Backend tool validation tests. Playwright E2E for the full suggest→approve/discard flow.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend**: `frontend/src/` at repository root
- **Backend**: `backend/` at repository root

---

## Phase 1: Setup

**Purpose**: Types, uniqueness constraints, and suggestion data structures

- [ ] T001 Create suggestion types in `frontend/src/types/suggestions.ts` — `PendingStatus`, `SuggestionSet`, `NodeModification`, `EdgeModification`, `PendingNode`, `PendingEdge` per data-model.md
- [ ] T002 [P] Add `pendingStatus` and `pendingOldValues` optional fields to `ArchitectureNodeData` and `ArchitectureEdgeData` in `frontend/src/types/graph.ts`. Add `edgeOffset` to `ArchitectureEdgeData`.
- [ ] T003 [P] Define 6 tool schemas in `backend/internal/llm/tools.go` — `add_node`, `delete_node`, `modify_node`, `add_edge`, `delete_edge`, `modify_edge` with input schemas per contracts/tool-definitions.md. Export as `ToolDefinitions []anthropic.ToolUnionParam`.
- [ ] T004 [P] Add `suggestion` WebSocket message type to `backend/internal/ws/message.go` — `SuggestionPayload` with `Tool`, `Params`, `Result`, `Error` fields per contracts/suggestion-messages.md

**Checkpoint**: Types compile. Tool schemas defined. Message types ready.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Node name uniqueness, edge uniqueness, and suggestion state management

**CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 Enforce node name uniqueness in `frontend/src/hooks/useGraphState.ts` — update `addNode` to auto-suffix "(2)", "(3)" etc. when default name exists. Block rename to existing name in `updateNodeData` (return false/error). Check committed + pending names.
- [ ] T006 Enforce edge uniqueness in `frontend/src/hooks/useGraphState.ts` — validate (source, target, protocol, direction) uniqueness on `onConnect`. Block in edge context menu protocol/direction changes that would create duplicates.
- [ ] T007 Create `frontend/src/hooks/useSuggestions.ts` — `SuggestionSet` state management: `addSuggestion(tool, params)`, `approveAll()`, `discardAll()`, `hasPending()`. Implements flattening rules per data-model.md. Returns merged display list (committed + pending with `pendingStatus` tags).
- [ ] T008 Write suggestion flattening tests in `frontend/src/__tests__/suggestions.test.ts` — test cases: add then delete same node (cancels), delete then re-add same-name committed node (cancels deletion), delete then add different-name node (two separate operations, not a modify), modify then modify same node (latest wins), add edge then modify it (applied to pending add), delete pending-add edge (removes it), delete edge then add same-identity edge (cancels deletion), delete edge then add different-protocol edge (two separate operations)
- [ ] T009 [P] Write node name uniqueness tests in `frontend/src/__tests__/uniqueness.test.ts` — test cases: auto-suffix on create, block rename to existing, uniqueness across pending state

**Checkpoint**: Uniqueness enforced. Suggestion flattening tests pass. `useSuggestions` hook works in isolation.

---

## Phase 3: User Story 1 — AI Suggests Diagram Changes (Priority: P1)

**Goal**: AI calls tools that create pending visual suggestions on the diagram

**Independent Test**: Build Service→Database. Ask "add a cache between them." Green-glowing Cache and edges appear. Old edge shows red strikethrough. AI explains reasoning.

### Implementation for User Story 1

- [ ] T010 [US1] Update `backend/internal/llm/client.go` — add `ToolDefinitions` to `MessageNewParams.Tools`. Handle `content_block_start` with `type: "tool_use"` and `content_block_delta` with `type: "input_json_delta"` to accumulate tool call JSON. On `content_block_stop` for tool_use blocks, parse the complete tool call.
- [ ] T011 [US1] Create tool validation in `backend/internal/ws/handler.go` — `validateToolCall(tool, params, graphState)` function that checks: node exists/doesn't exist, name uniqueness, edge uniqueness, type constraints (no type change on modify_node, no source/target change on modify_edge). Returns success or error message.
- [ ] T012 [US1] Update WebSocket handler in `backend/internal/ws/handler.go` — on tool_use block completion: validate the tool call, send `suggestion` message to frontend (success or error), construct `tool_result` content block, append to conversation, re-call Claude with tool results for continuation.
- [ ] T013 [US1] Write tool validation tests in `backend/internal/ws/handler_test.go` — test cases: valid add_node, duplicate name error, valid delete_node, node not found error, valid modify_node, type change rejected, valid edge operations, duplicate edge rejected
- [ ] T014 [US1] Update system prompt in `backend/internal/llm/prompt.go` — add instruction: "You have tools to suggest changes to the diagram. When asked to modify the architecture, use these tools directly — don't describe what you would do and ask permission. The tools create pending suggestions that the user will approve or discard."
- [ ] T015 [US1] Handle `suggestion` messages in `frontend/src/App.tsx` — on receiving a `suggestion` message from WebSocket, call `useSuggestions.addSuggestion(tool, params)`. On error suggestions, display the error in chat.
- [ ] T016 [US1] Update `frontend/src/components/NodeTypes/BaseNode.tsx` — read `pendingStatus` from node data. Apply CSS: green glow for `pendingAdd`, red glow + strikethrough name for `pendingDelete`, "old → new" for `pendingModify` (read `pendingOldValues`).
- [ ] T017 [US1] Update `frontend/src/components/EdgeTypes/LabeledEdge.tsx` — read `pendingStatus` from edge data. Apply CSS: green glow for `pendingAdd`, red + strikethrough label (or × if no label) for `pendingDelete`, "old → new" for `pendingModify`. Apply `edgeOffset` for coincident pending edges.
- [ ] T018 [P] [US1] Update `frontend/src/components/NodeTypes/NodeTypes.css` — add `.node-pending-add` (green glow), `.node-pending-delete` (red glow + strikethrough), `.node-pending-modify` (highlight changed fields) styles
- [ ] T019 [P] [US1] Update `frontend/src/components/EdgeTypes/EdgeTypes.css` — add `.edge-pending-add`, `.edge-pending-delete`, `.edge-pending-modify` styles
- [ ] T020 [US1] Update `frontend/src/App.tsx` — pass merged display list (from `useSuggestions`) to Canvas instead of raw committed state. Ensure graph serialization for chat messages includes committed + pending state.
- [ ] T021 [US1] Auto-position AI-added nodes in `frontend/src/hooks/useSuggestions.ts` — when `add_node` has no position, compute: midpoint of connected nodes offset 150-200px, or 200px below last node, or center of viewport as fallback.

**Checkpoint**: AI tool calls create visual suggestions. Green/red/modify styling works. Errors display in chat.

---

## Phase 4: User Story 2 — Approve or Discard (Priority: P1)

**Goal**: Approve All commits pending changes. Discard All reverts.

**Independent Test**: AI suggests adding a cache. Click Approve All — cache commits, visual treatment disappears. Alternatively, click Discard All — cache disappears, diagram reverts.

### Implementation for User Story 2

- [ ] T022 [US2] Create `SuggestionBar` component in `frontend/src/components/SuggestionBar/SuggestionBar.tsx` — shows pending suggestion count + "Approve All" and "Discard All" buttons. Only visible when `hasPending()` is true. Add `data-testid="suggestion-bar"`, `data-testid="approve-all"`, `data-testid="discard-all"`.
- [ ] T023 [P] [US2] Create `frontend/src/components/SuggestionBar/SuggestionBar.css` — floating bar styles, positioned above the canvas or in the header
- [ ] T024 [US2] Wire SuggestionBar in `frontend/src/App.tsx` — pass `approveAll`, `discardAll`, `hasPending` from useSuggestions. On approve: merge suggestions into committed state via useGraphState. On discard: clear suggestions.
- [ ] T025 [US2] Implement `approveAll` in `frontend/src/hooks/useSuggestions.ts` — splice additions into committed arrays, remove deletions, apply modifications. Single state update. Clear suggestion set.
- [ ] T026 [US2] Implement `discardAll` in `frontend/src/hooks/useSuggestions.ts` — clear suggestion set. Committed state unchanged.

**Checkpoint**: Approve commits all suggestions. Discard reverts. Buttons hide when no pending.

---

## Phase 5: User Story 3 — AI Sees Pending State (Priority: P2)

**Goal**: Three-section prompt gives AI full context of committed, pending, and merged state

**Independent Test**: AI suggests cache. Without approving, ask "also add a load balancer." AI builds on pending cache. Prompt includes three views.

### Implementation for User Story 3

- [ ] T027 [US3] Update `backend/internal/graph/prompt.go` — `BuildPrompt` now accepts committed state AND pending suggestions. Generates three sections: "### Current Architecture" (committed only), "### Proposed Changes" (list of pending operations), "### Architecture After Approval" (merged topology analysis).
- [ ] T028 [US3] Update `backend/internal/graph/prompt_test.go` — test three-view prompt: committed-only section excludes pending, proposed changes lists operations, merged section includes all
- [ ] T029 [US3] Update `frontend/src/App.tsx` — when sending `chat_message`, include both committed graph state and pending suggestions in the payload so the backend can build the three-view prompt
- [ ] T030 [US3] Update `backend/internal/ws/message.go` — `ChatMessagePayload` gains `PendingSuggestions` field with add/delete/modify lists
- [ ] T031 [US3] Update `backend/internal/ws/handler.go` — pass pending suggestions to prompt builder alongside committed graph state

**Checkpoint**: AI sees three views. Follow-up suggestions build on pending state.

---

## Phase 6: User Story 4 — Suggestion Flattening (Priority: P2)

**Goal**: Contradictory suggestions across turns automatically resolve

**Independent Test**: AI adds node X. Next turn, AI deletes node X. Result: no pending changes.

### Implementation for User Story 4

- [ ] T032 [US4] Verify flattening logic in `frontend/src/hooks/useSuggestions.ts` — this was implemented in T007 and tested in T008. This task verifies all flattening scenarios work end-to-end: add→delete cancels, delete→re-add cancels, modify→modify replaces, modify pending-add applies directly.
- [ ] T033 [US4] Test edge deletion cascade in `frontend/src/hooks/useSuggestions.ts` — when a committed node is deleted via tool, all its committed edges should also be marked pending-delete. Verify with unit test.

**Checkpoint**: All flattening scenarios verified. Edge cascade works.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Update existing tests, cleanup, validation

- [ ] T034 [P] Update existing Playwright E2E tests — ensure palette drag still auto-suffixes duplicate names. Update any tests affected by uniqueness enforcement.
- [ ] T035 [P] Update node name input validation in `frontend/src/components/NodeTypes/BaseNode.tsx` — show visual error (red border) when user types a name that already exists. Revert to previous name on blur if invalid.
- [ ] T036 Run full lint and test suite — `make lint && make test`, fix any issues
- [ ] T037 Run quickstart validation — verify AI tool use, approve/discard, and multi-turn suggestions per quickstart.md

---

## Phase 8: E2E Testing (Playwright)

**Purpose**: Automated tests for AI collaboration tools

- [ ] T038 Write E2E test in `frontend/e2e/ai-collaboration.spec.ts` — submit "add a cache node called Redis" → verify suggestion message appears → verify green-glow node visible on canvas → click Approve All → verify node committed (no glow)
- [ ] T039 Write E2E test for discard in `frontend/e2e/ai-collaboration.spec.ts` — submit suggestion request → verify pending items appear → click Discard All → verify diagram reverts to original state
- [ ] T040 Write E2E test for node name uniqueness in `frontend/e2e/ai-collaboration.spec.ts` — drag two Services from palette → verify second is named "Service (2)" → try renaming to "Service" → verify blocked
- [ ] T041 Verify all Playwright tests pass — `make e2e` (requires ANTHROPIC_API_KEY)

**Checkpoint**: All E2E tests pass including AI tool suggestions, approve/discard, and uniqueness.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup (needs types)
- **User Stories (Phase 3+)**:
  - US1 (AI Suggests) depends on Foundational (needs useSuggestions, uniqueness)
  - US2 (Approve/Discard) depends on US1 (needs suggestions to exist)
  - US3 (AI Sees Pending) depends on US1 (needs suggestion flow working)
  - US4 (Flattening) depends on US1 (needs suggestion state)
- **Polish (Phase 7)**: Depends on all user stories
- **E2E (Phase 8)**: Depends on Polish

### Parallel Opportunities

- T002, T003, T004 can run in parallel (Setup — different files/languages)
- T008, T009 can run in parallel (Foundational tests — different files)
- T018, T019 can run in parallel (US1 CSS — different files)
- T022, T023 can run in parallel (US2 component + CSS)
- T034, T035 can run in parallel (Polish — different files)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Setup (types + tool schemas)
2. Foundational (uniqueness + suggestion state + flattening tests)
3. US1 (AI tool calls → visual suggestions)
4. **STOP and VALIDATE**: AI calls tools, green/red/modify styling appears

### Incremental Delivery

1. Setup + Foundational → uniqueness enforced, suggestion state working
2. US1 → AI suggests changes visually
3. US2 → Approve/Discard workflow
4. US3 → Three-view prompt for multi-turn collaboration
5. US4 → Flattening verified end-to-end
6. Polish + E2E → tests updated, full validation

---

## ADR Handling During Implementation

- **NEVER edit the body** of an existing ADR during task implementation
- If a task requires changing a previously recorded decision, **create a new superseding ADR**

## Notes

- This is the most complex milestone — 41 tasks across 8 phases
- The tool_use streaming pattern (accumulate partial JSON from `input_json_delta` events) is the highest-risk backend task
- Flattening logic is the highest-risk frontend task — thorough unit tests (T008) are critical
- Node name uniqueness (T005) retroactively changes existing behavior — existing E2E tests may need updates
- ANTHROPIC_API_KEY required for E2E tests that exercise AI tool calls
