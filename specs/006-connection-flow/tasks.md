# Tasks: Connections and Flow Refinement

**Input**: Design documents from `/specs/006-connection-flow/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Serialization tests for new edge properties. Backend analyzer/prompt tests for protocol-aware analysis. Playwright E2E for protocol selection, direction, and context menu.

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

**Purpose**: Expand type definitions for protocol, direction, and sync/async

- [x] T001 Add `EdgeProtocol`, `EdgeDirection`, protocol registry (8 protocols with label, default syncAsync, color), and `protocolDefaults` lookup to `frontend/src/types/graph.ts`. Update `ArchitectureEdgeData` to include `protocol`, `direction`, `syncAsync` fields. Update `SerializedEdge` with optional `protocol`, `direction`, `syncAsync`.
- [x] T002 [P] Update `backend/internal/model/graph.go` — add `Protocol string`, `Direction string`, `SyncAsync string` fields to `GraphEdge` with `json:"...,omitempty"` tags
- [x] T003 [P] Update `backend/internal/ws/message.go` — ensure `GraphEdge` in message types picks up the new fields from model

**Checkpoint**: Types compile on both sides. Protocol registry has 8 entries.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Unified handles and edge data model changes

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Update `frontend/src/components/NodeTypes/BaseNode.tsx` — replace 4 handles (2 source, 2 target) with 8 handles: dual source+target at each position (top, bottom, left, right), overlapping visually. IDs: `top-source`, `top-target`, `bottom-source`, `bottom-target`, `left-source`, `left-target`, `right-source`, `right-target`.
- [x] T005 Update `frontend/src/components/Canvas/Canvas.tsx` — add `connectionMode="loose"` prop to `<ReactFlow>`. Update `isValidConnection` to work with any source→target combination (keep self-connection prevention).
- [x] T006 Update `frontend/src/hooks/useGraphState.ts` — update `onConnect` to set default edge data: `protocol: undefined, direction: 'oneWay', syncAsync: 'sync'`. Add `updateEdgeProtocol(edgeId, protocol, syncAsync)`, `toggleEdgeDirection(edgeId)`, `reverseEdge(edgeId)` helper functions.
- [x] T007 Update `frontend/src/services/graphSerializer.ts` — include `protocol`, `direction`, `syncAsync` in serialized edges (omit when undefined/default)
- [x] T008 Update serialization tests in `frontend/src/__tests__/graphSerializer.test.ts` — add tests for edges with protocol/direction/syncAsync, edges without (backwards compat), bidirectional edges

**Checkpoint**: Connections work from any handle to any handle. Edge data includes protocol fields. Serialization tests pass.

---

## Phase 3: User Story 1 — Connect Any Handle to Any Handle (Priority: P1)

**Goal**: Remove fixed source/target distinction on handles, arrow defines direction

**Independent Test**: Drag from top handle of Node A to bottom handle of Node B — arrow points A→B. Drag from Node B's left to Node A's right — arrow points B→A. Both valid.

### Implementation for User Story 1

- [x] T009 [US1] Add CSS to `frontend/src/components/NodeTypes/NodeTypes.css` — style dual handles to overlap at each position (source and target at same spot). Use `:nth-child` or class-based hiding so only one visual dot appears per position.
- [x] T010 [US1] Verify self-connection prevention still works with unified handles in `frontend/src/components/Canvas/Canvas.tsx` — `isValidConnection` checks `source !== target`

**Checkpoint**: Any-to-any handle connections work. Self-connections blocked. Arrows show correct direction.

---

## Phase 4: User Story 2 — Protocol Selection and Edge Styling (Priority: P1)

**Goal**: Click an edge to select protocol, toggle direction, reverse, see color/dash changes

**Independent Test**: Connect two nodes. Click the edge — context menu shows 8 protocols. Select HTTP — solid blue line. Switch to async — dashed green. Toggle bidirectional — arrows on both ends. Reverse — arrow flips.

### Implementation for User Story 2

- [x] T011 [US2] Create `EdgeContextMenu` component in `frontend/src/components/EdgeContextMenu/EdgeContextMenu.tsx` — floating div positioned at click coordinates. Shows: protocol selector (8 predefined + custom text input), sync/async toggle (defaults from protocol, overridable), direction toggle (one-way/bidirectional), reverse button. Add `data-testid="edge-context-menu"`, `data-testid="protocol-select"`, `data-testid="sync-async-toggle"`, `data-testid="direction-toggle"`, `data-testid="reverse-btn"`.
- [x] T012 [P] [US2] Create `frontend/src/components/EdgeContextMenu/EdgeContextMenu.css` — floating menu styles, protocol color swatches, active states
- [x] T013 [US2] Update `frontend/src/components/EdgeTypes/LabeledEdge.tsx` — read `protocol`, `direction`, `syncAsync` from edge data. Set stroke color from protocol color map. Set `strokeDasharray: '6 3'` when async. Set `markerStart` + `markerEnd` when bidirectional, `markerEnd` only when one-way. Show protocol label (not freeform text input — remove old input).
- [x] T014 [US2] Update `frontend/src/components/EdgeTypes/EdgeTypes.css` — protocol-colored labels, dashed line animation
- [x] T015 [US2] Wire edge context menu in `frontend/src/App.tsx` — use `onEdgeClick` on `<ReactFlow>` to capture edge ID + screen position, render `EdgeContextMenu`, pass `updateEdgeProtocol`, `toggleEdgeDirection`, `reverseEdge` from useGraphState. Close on click-outside.
- [x] T016 [US2] Update `frontend/src/components/Canvas/Canvas.tsx` — pass `onEdgeClick` handler, update `defaultEdgeOptions` marker colors to match protocol

**Checkpoint**: Protocol selection works. Colors and dashing change. Direction toggles. Reverse flips the arrow. Debug panel JSON reflects all properties.

---

## Phase 5: User Story 3 — AI Protocol-Aware Analysis (Priority: P2)

**Goal**: AI references sync/async boundaries, protocol types, chain depth in analysis

**Independent Test**: Build a diagram with HTTP (sync) and async connections in a chain. Ask AI. Response distinguishes sync vs async paths and flags long sync chains.

### Implementation for User Story 3

- [x] T017 [US3] Update `backend/internal/graph/analyzer.go` — add `SyncChainDepth int`, `AsyncBoundaries []string`, `BidirectionalEdges []string` to TopologyAnalysis. Compute sync chain depth via DFS following only sync edges. Detect sync→async transitions. Identify bidirectional node pairs.
- [x] T018 [US3] Update `backend/internal/graph/analyzer_test.go` — test cases: mixed sync/async chain, sync chain depth calculation, async boundary detection, bidirectional edge identification
- [x] T019 [US3] Update `backend/internal/graph/prompt.go` — add "### Connection Analysis" section to topology summary: sync chain depth, async boundaries, bidirectional dependencies, protocol distribution
- [x] T020 [US3] Update `backend/internal/graph/prompt_test.go` — verify prompt includes protocol-aware sections when edges have protocols set

**Checkpoint**: Backend tests pass. AI analysis includes protocol and sync/async context.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Update existing tests, cleanup, validation

- [x] T021 [P] Update existing Playwright E2E tests — update any edge-related tests that reference the old freeform text input pattern. Ensure existing drag/connect tests work with unified handles.
- [x] T022 Run full lint and test suite — `make lint && make test`, fix any issues
- [x] T023 Run quickstart validation — verify protocol selection, direction controls, and AI analysis per quickstart.md

---

## Phase 7: E2E Testing (Playwright)

**Purpose**: Automated tests for protocol selection, direction, and context menu

- [x] T024 Write E2E test in `frontend/e2e/connection-flow.spec.ts` — test: connect two nodes via any handle combination, verify edge appears in debug panel JSON
- [x] T025 Write E2E test for protocol selection in `frontend/e2e/connection-flow.spec.ts` — connect two nodes, click edge to open context menu (`data-testid="edge-context-menu"`), select HTTP protocol, verify debug panel JSON shows `protocol: "http"` and `syncAsync: "sync"`
- [x] T026 Write E2E test for direction in `frontend/e2e/connection-flow.spec.ts` — connect two nodes, open context menu, toggle bidirectional, verify JSON shows `direction: "bidirectional"`. Click reverse, verify source/target swap.
- [x] T027 Verify all Playwright tests pass — `make e2e` (requires ANTHROPIC_API_KEY)

**Checkpoint**: All E2E tests pass including protocol selection and direction controls.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup (needs new types)
- **User Stories (Phase 3+)**:
  - US1 (Unified Handles) depends on Foundational
  - US2 (Protocol/Direction) depends on Foundational + US1 (needs unified handles working)
  - US3 (AI Analysis) depends on US2 (needs protocol data in edges)
- **Polish (Phase 6)**: Depends on all user stories
- **E2E (Phase 7)**: Depends on Polish

### Parallel Opportunities

- T002, T003 can run in parallel (Setup — different Go files)
- T011, T012 can run in parallel (US2 — component + CSS)
- T017, T018, T019, T020 can run in parallel within US3 (different files)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Setup (types)
2. Foundational (unified handles, edge data)
3. US1 (any-to-any connections)
4. **STOP and VALIDATE**: Connect from any handle, arrows correct

### Incremental Delivery

1. Setup + Foundational → unified handles, new edge data model
2. US1 → Any-to-any connections
3. US2 → Protocol selector, colors, dashing, direction controls
4. US3 → AI protocol-aware analysis
5. Polish + E2E → tests updated, full validation

---

## ADR Handling During Implementation

- **NEVER edit the body** of an existing ADR during task implementation
- If a task requires changing a previously recorded decision, **create a new superseding ADR**

## Notes

- [P] tasks = different files, no dependencies
- The unified handle approach (dual source+target at each position) is the highest-risk change — test immediately after T004/T005
- Existing edges with no protocol must continue to work (backwards compat)
- The edge context menu replaces the old freeform text input on edges
- Protocol colors must be visually distinct across all 8 predefined types + unlabeled default
