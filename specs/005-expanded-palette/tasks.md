# Tasks: Expanded Component Library + Scalability

**Input**: Design documents from `/specs/005-expanded-palette/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Serialization tests updated for new types and replicaCount. Backend analyzer/prompt tests updated. Playwright E2E for expanded palette and scalability.

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

**Purpose**: Install dependencies and expand shared type definitions

- [x] T001 Install `lucide-react` in `frontend/` via `npm install lucide-react`
- [x] T002 Expand `ComponentType` enum and related types in `frontend/src/types/graph.ts` — add all 18 types, `ComponentCategory` type, `componentTypeLabels` for all 18, `categoryColors` map, `componentRegistry` array with type/label/category/icon/supportsReplicas config per data-model.md. Add `replicaCount` to `ArchitectureNodeData`. Add `replicaCount` to `SerializedNode`.
- [x] T003 [P] Update `backend/internal/model/graph.go` — add `ReplicaCount int` field to `GraphNode` with `json:"replicaCount,omitempty"`

**Checkpoint**: Types compile on both sides. Registry has 18 entries.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Refactor node rendering to data-driven registry pattern

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Refactor `frontend/src/components/NodeTypes/BaseNode.tsx` — accept `icon` (LucideIcon component), `categoryColor`, and `supportsReplicas` from registry config. Render icon at 16px, use category color for border. Show replica badge (×N) when `replicaCount > 1`. Add `data-testid="replica-count-{id}"` on the badge.
- [x] T005 Refactor `frontend/src/components/NodeTypes/index.ts` — replace individual node imports with a data-driven `nodeTypes` object generated from `componentRegistry`. For each registry entry, create a wrapper component that passes the config to BaseNode. Export the resulting `NodeTypes` object.
- [x] T006 Delete individual node component files: `frontend/src/components/NodeTypes/ServiceNode.tsx`, `DatabaseNode.tsx`, `CacheNode.tsx`, `QueueNode.tsx`, `LoadBalancerNode.tsx` — all replaced by the registry pattern
- [x] T007 Update `frontend/src/components/NodeTypes/NodeTypes.css` — replace 5 hardcoded type colors with 5 category-based color classes (`.node-compute`, `.node-data`, `.node-messaging`, `.node-network`, `.node-clients`). Add replica badge styles.

**Checkpoint**: Existing 5 types still render correctly via registry. `make dev` shows same behavior as before refactor.

---

## Phase 3: User Story 1 — Full Component Library (Priority: P1)

**Goal**: All 18 types in the palette, organized by category, draggable to canvas with icons

**Independent Test**: Open the palette. See 18 types in 5 categories. Drag one from each category. Each renders with category color and icon. Ask the AI — it recognizes all types.

### Implementation for User Story 1

- [x] T008 [US1] Update Palette in `frontend/src/components/Palette/Palette.tsx` — render components grouped by category from `componentRegistry`, show icon next to each label, add `data-testid="palette-{type}"` for all 18 types
- [x] T009 [US1] Update `frontend/src/components/Palette/Palette.css` — category group styling with color-coded headers, scrollable container
- [x] T010 [US1] Update `frontend/src/services/graphSerializer.ts` — include `replicaCount` in serialized output (omit when undefined or 1)
- [x] T011 [US1] Update serialization tests in `frontend/src/__tests__/graphSerializer.test.ts` — add tests for new types (e.g., `apiGateway`, `iotClient`) and `replicaCount` serialization (present when > 1, omitted when 1 or undefined)
- [x] T012 [US1] Update `backend/internal/graph/analyzer.go` — include `ReplicaCount` in topology analysis: add `ScaledNodes` field (map of node name → replica count for nodes with replicas > 1)
- [x] T013 [US1] Update `backend/internal/graph/prompt.go` — show replica count in component list (e.g., "API (service, ×3)"), add "Scaled services" section in topology analysis
- [x] T014 [US1] Update backend analyzer/prompt tests — add test cases for nodes with replica counts, verify prompt mentions scaling

**Checkpoint**: All 18 types work. AI references new types and scaling in analysis.

---

## Phase 4: User Story 2 — Scalability Annotations (Priority: P1)

**Goal**: User can set replica count on supported nodes, see visual indicator, AI-aware

**Independent Test**: Drag a Service. Set replica count to 3. Node shows "×3". Ask AI — response mentions "3 replicas".

### Implementation for User Story 2

- [x] T015 [US2] Add replica count control to BaseNode in `frontend/src/components/NodeTypes/BaseNode.tsx` — small +/- stepper or numeric input, only visible when `supportsReplicas` is true. Updates via `updateNodeData`. Minimum value 1. Add `data-testid="replica-input-{id}"`.
- [x] T016 [US2] Update `frontend/src/components/NodeTypes/NodeTypes.css` — styles for replica count control (compact, doesn't interfere with node name or handles)

**Checkpoint**: Replica count works on supported types. Not available on excluded types. AI references scaling.

---

## Phase 5: User Story 3 — Browse by Category (Priority: P2)

**Goal**: Collapsible category sections in the palette

**Independent Test**: Click a category heading — it collapses. Click again — expands. All categories start expanded.

### Implementation for User Story 3

- [x] T017 [US3] Add collapsible sections to Palette in `frontend/src/components/Palette/Palette.tsx` — each category heading is clickable, toggles visibility of its components. All expanded by default. Add `data-testid="category-{name}"` on headers.
- [x] T018 [US3] Update `frontend/src/components/Palette/Palette.css` — collapse/expand animation, visual toggle indicator (chevron or +/-)

**Checkpoint**: Categories collapse and expand. Palette scrolls when long.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Update existing tests, visual polish, validation

- [x] T019 [P] Update Playwright E2E tests in `frontend/e2e/drag-and-connect.spec.ts` — update palette test to verify 18 types (or at least verify category structure exists). Ensure existing drag tests still pass with registry pattern.
- [x] T020 [P] Update `frontend/e2e/ai-responds.spec.ts` — verify AI response works with new component types
- [x] T021 Run full lint and test suite — `make lint && make test`, fix any issues
- [x] T022 Run quickstart validation — verify all 18 types, replica counts, and categories work per quickstart.md

---

## Phase 7: E2E Testing (Playwright)

**Purpose**: Automated tests for expanded palette and scalability

- [x] T023 Write E2E test in `frontend/e2e/expanded-palette.spec.ts` — verify: all 5 category headings visible, drag new type (e.g., `apiGateway`) onto canvas, verify node appears in debug panel JSON with correct type
- [x] T024 Write E2E test for scalability in `frontend/e2e/expanded-palette.spec.ts` — drag a Service, set replica count to 3 via `data-testid="replica-input-{id}"`, verify debug panel JSON shows `replicaCount: 3`
- [x] T025 Verify all Playwright tests pass — `make e2e` (requires ANTHROPIC_API_KEY)

**Checkpoint**: All E2E tests pass including new component types and scalability.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup (needs expanded types + lucide-react)
- **User Stories (Phase 3+)**:
  - US1 (Full Library) depends on Foundational (needs registry pattern)
  - US2 (Scalability) depends on Foundational (needs BaseNode with replica support)
  - US3 (Categories) can run after US1 (needs palette with all types)
- **Polish (Phase 6)**: Depends on all user stories
- **E2E (Phase 7)**: Depends on Polish

### Parallel Opportunities

- T002, T003 can run in parallel (Setup — different languages)
- T008, T009 can run in parallel with T010-T014 (frontend palette vs serialization/backend)
- T019, T020 can run in parallel (Polish — different test files)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Setup (types + lucide-react)
2. Foundational (registry refactor)
3. US1 (all 18 types in palette, serialization, backend prompt)
4. **STOP and VALIDATE**: All types render, AI recognizes them

### Incremental Delivery

1. Setup + Foundational → registry pattern working with existing 5 types
2. US1 → Full 18-type palette with icons and category colors
3. US2 → Replica count annotations
4. US3 → Collapsible categories
5. Polish + E2E → tests updated, full validation

---

## ADR Handling During Implementation

- **NEVER edit the body** of an existing ADR during task implementation
- If a task requires changing a previously recorded decision, **create a new superseding ADR**

## Notes

- [P] tasks = different files, no dependencies
- The registry refactor (Phase 2) is the highest-risk task — it replaces 5 files with a data-driven pattern. Test immediately after.
- Backwards compatibility: existing `database` type must still work (maps to `databaseSql` in the registry, or keep the original value)
- The 5 original type string values (`service`, `database`, `cache`, `queue`, `loadBalancer`) must be preserved in the registry to avoid breaking existing serialization
