# Tasks: Drag and Connect

**Input**: Design documents from `/specs/002-drag-and-connect/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Graph serialization is the critical contract for Milestone 3 (AI integration). Serialization tests are included to validate the JSON contract.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend**: `frontend/src/` at repository root

---

## Phase 1: Setup

**Purpose**: Create shared type definitions and infrastructure used by all user stories

- [x] T001 Define ComponentType enum and node/edge TypeScript types in `frontend/src/types/graph.ts` — includes `ComponentType`, `ArchitectureNodeData`, `ArchitectureEdgeData`, and `GraphState` interfaces per data-model.md
- [x] T002 [P] Create graph state management hook in `frontend/src/hooks/useGraphState.ts` — wraps `useNodesState`/`useEdgesState` from React Flow, exposes `addNode`, `removeNode`, `updateNodeData`, node/edge arrays, and serialized graph state

**Checkpoint**: Types compile. Hook can be imported and used.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Custom node components that all user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 [P] Create ServiceNode component in `frontend/src/components/NodeTypes/ServiceNode.tsx` — styled node with connection handles (top/bottom/left/right), editable name input with `nodrag nopan` classes, visual type indicator. Add `data-testid="node-{id}"` on wrapper and `data-testid="node-name-{id}"` on name input
- [x] T004 [P] Create DatabaseNode component in `frontend/src/components/NodeTypes/DatabaseNode.tsx` — same pattern as ServiceNode with distinct visual styling and same `data-testid` conventions
- [x] T005 [P] Create CacheNode component in `frontend/src/components/NodeTypes/CacheNode.tsx` — same pattern with distinct visual styling and same `data-testid` conventions
- [x] T006 [P] Create QueueNode component in `frontend/src/components/NodeTypes/QueueNode.tsx` — same pattern with distinct visual styling and same `data-testid` conventions
- [x] T007 [P] Create LoadBalancerNode component in `frontend/src/components/NodeTypes/LoadBalancerNode.tsx` — same pattern with distinct visual styling and same `data-testid` conventions
- [x] T008 Create nodeTypes registry in `frontend/src/components/NodeTypes/index.ts` — exports `nodeTypes` object mapping ComponentType values to node components, defined at module level (not inside a component)

**Checkpoint**: All 5 node types render when manually added to the canvas. Each is visually distinguishable.

---

## Phase 3: User Story 1 — Drag Components onto the Canvas (Priority: P1)

**Goal**: Users drag components from a palette onto the canvas where they appear as styled, editable nodes

**Independent Test**: Open the app. Drag a Service from the palette. It appears at the drop position with type label and default name. Drag other types. Double-click a name to edit it.

### Implementation for User Story 1

- [x] T009 [US1] Create Palette component in `frontend/src/components/Palette/Palette.tsx` — vertical list of 5 component types, each item `draggable` with `onDragStart` setting `dataTransfer` to `application/reactflow` with the component type. Add `data-testid="palette-{type}"` on each item (e.g., `palette-service`, `palette-database`)
- [x] T010 [US1] Update Canvas component in `frontend/src/components/Canvas/Canvas.tsx` — add `onDragOver` and `onDrop` handlers using `screenToFlowPosition` to convert drop coordinates, create new node with `crypto.randomUUID()` ID and type from `dataTransfer`
- [x] T011 [US1] Wire up Canvas with `useGraphState` hook and pass `nodeTypes` registry from `frontend/src/components/NodeTypes/index.ts`
- [x] T012 [US1] Add `isValidConnection` callback to Canvas to prevent self-connections (`source !== target`)
- [x] T013 [US1] Update `frontend/src/App.tsx` layout — side-by-side: Palette (left) + Canvas (center), full height

**Checkpoint**: Drag all 5 types from palette to canvas. Each appears at drop position. Edit names inline. Self-connections blocked.

---

## Phase 4: User Story 2 — Connect Components with Edges (Priority: P1)

**Goal**: Users create directed edges between nodes with optional editable labels

**Independent Test**: Place two nodes. Drag from one handle to another. Arrow appears. Click/double-click edge to add label. Delete edge — nodes remain.

### Implementation for User Story 2

- [x] T014 [US2] Create custom LabeledEdge component in `frontend/src/components/EdgeTypes/LabeledEdge.tsx` — uses `getBezierPath`, `BaseEdge`, `EdgeLabelRenderer` with an editable input positioned at `(labelX, labelY)`, `pointerEvents: 'all'`. Add `data-testid="edge-{id}"` on the edge group and `data-testid="edge-label-{id}"` on the label input
- [x] T015 [US2] Create edgeTypes registry in `frontend/src/components/EdgeTypes/index.ts` — exports `edgeTypes` object with the LabeledEdge as default edge type
- [x] T016 [US2] Update Canvas to pass `edgeTypes` and set `defaultEdgeOptions` with `type: 'labeled'` so all new edges use the custom component
- [x] T017 [US2] Add `onEdgesDelete` handler in `useGraphState` hook to support edge deletion; verify `onNodesDelete` cascades edge removal (React Flow default behavior)

**Checkpoint**: Create edges between nodes. Edges show as directed arrows. Edit labels. Delete edges and nodes — cascade works correctly.

---

## Phase 5: User Story 3 — Inspect Graph State as JSON (Priority: P2)

**Goal**: A collapsible debug panel shows the live JSON representation of the graph

**Independent Test**: Build a diagram. Toggle the debug panel open. JSON accurately shows all nodes (type, name, position) and edges (source, target, label). Modify the diagram — JSON updates immediately.

### Implementation for User Story 3

- [x] T018 [US3] Create graph serializer in `frontend/src/services/graphSerializer.ts` — transforms React Flow node/edge arrays into the `GraphState` contract (strips internal React Flow fields, maps `data.label` to top-level `name`/`label`)
- [x] T019 [US3] Write serialization tests in `frontend/src/__tests__/graphSerializer.test.ts` — test cases: empty graph, single node, multiple nodes with edges, edges with/without labels, node deletion cascade verification
- [x] T020 [US3] Create DebugPanel component in `frontend/src/components/DebugPanel/DebugPanel.tsx` — collapsible side panel, hidden by default, toggle via button and keyboard shortcut, displays `JSON.stringify(graphState, null, 2)` in a `<pre>` block, updates live. Add `data-testid="debug-toggle"` on toggle button and `data-testid="debug-panel-json"` on the JSON content element
- [x] T021 [US3] Update `frontend/src/App.tsx` layout — add DebugPanel (right side), toggle button in toolbar/header area, keyboard shortcut handler

**Checkpoint**: Toggle debug panel open. JSON matches the current graph. Add/remove nodes and edges — JSON updates immediately.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Visual polish, cleanup, and validation

- [x] T022 [P] Add CSS styles for node types in `frontend/src/components/NodeTypes/` — distinct colors/shapes per component type so all 5 are visually distinguishable at a glance
- [x] T023 [P] Add CSS styles for Palette in `frontend/src/components/Palette/` — clear drag affordance, component type icons or labels
- [x] T024 [P] Add CSS styles for DebugPanel in `frontend/src/components/DebugPanel/` — monospace font, scroll for long JSON, clear open/close animation
- [x] T025 [P] Run full lint and test suite — `make lint && make test`, fix any issues
- [x] T026 Run quickstart validation — follow `specs/002-drag-and-connect/quickstart.md` steps and verify every interaction works

---

## Phase 7: E2E Testing (Playwright)

**Purpose**: Automated browser tests that validate the full drag → connect → inspect flow, usable by both CI and Claude

- [x] T027 Install Playwright in `frontend/` via `npm init playwright@latest` — configure for Chromium only, create `frontend/playwright.config.ts` pointing at `http://localhost:5173`, add `frontend/e2e/` directory
- [x] T028 [P] Add `e2e` and `e2e-ui` targets to root `Makefile` — `e2e` runs headless (`npx playwright test`), `e2e-ui` runs with Playwright UI mode for debugging
- [x] T029 Write E2E smoke test in `frontend/e2e/drag-and-connect.spec.ts` — test flow: open app → verify palette visible → drag Service onto canvas via `page.dragAndDrop('[data-testid="palette-service"]', '.react-flow')` → verify node appears → drag Database → create edge between them → open debug panel via `click('[data-testid="debug-toggle"]')` → assert JSON in `[data-testid="debug-panel-json"]` contains both nodes and one edge
- [x] T030 Verify Playwright tests pass — run `make e2e` with dev server running, confirm green

**Checkpoint**: `make e2e` runs headless and validates the core user flow end-to-end.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup (needs types from T001)
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - US1 (Drag) can start after Foundational
  - US2 (Edges) can start after Foundational (independent of US1 for edge component, but integration needs nodes on canvas)
  - US3 (JSON) depends on US1 and US2 (needs nodes and edges to serialize)
- **Polish (Phase 6)**: Depends on all user stories being complete
- **E2E Testing (Phase 7)**: Depends on Polish (needs working, linted app to test against)

### Within Each User Story

- Components before integration
- Serializer before debug panel (US3)
- Story complete before moving to next priority

### Parallel Opportunities

- T001, T002 can run in parallel (Setup — different files)
- T003, T004, T005, T006, T007 can all run in parallel (Foundational — 5 independent node components)
- T022, T023, T024 can run in parallel (Polish — independent CSS files)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (types + hook)
2. Complete Phase 2: Foundational (5 node components + registry)
3. Complete Phase 3: User Story 1 (palette + drag-to-canvas)
4. **STOP and VALIDATE**: Drag components, edit names, verify visuals

### Incremental Delivery

1. Setup + Foundational → node types ready
2. US1 → Palette visible, drag components onto canvas
3. US2 → Connect components with labeled edges
4. US3 → Debug panel shows live JSON
5. Polish → Visual refinement, lint, full validation

---

## ADR Handling During Implementation

- **NEVER edit the body** of an existing ADR during task implementation
- If a task requires changing a previously recorded decision, **create a new superseding ADR**
- When a new ADR supersedes an old one, you MAY update the old ADR's **Status** and **Related ADRs** fields only

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
