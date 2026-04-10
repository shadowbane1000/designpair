# Tasks: Curated Example Diagrams

**Input**: Design documents from `/specs/009-curated-example-diagrams/`

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Example Data

- [ ] T001 [US1] Create example diagram data module at `frontend/src/data/examples.ts` with ExampleDiagram type and 4 curated examples (e-commerce, real-time chat, URL shortener, IoT pipeline) using ArchitectureNode/ArchitectureEdge types
- [ ] T002 [P] [US1] Add unit tests for example data validation at `frontend/src/data/examples.test.ts` — verify all node types are valid, all edge source/targets reference existing nodes, positions don't overlap

## Phase 2: Load Example into Canvas

- [ ] T003 [US1] Add `loadExample` function to `useGraphState` hook that accepts nodes and edges arrays and replaces current state
- [ ] T004 [US1] Add `setChatInput` prop to ChatPanel to allow external control of the input field (for pre-filling suggested question)

## Phase 3: UI Components

- [ ] T005 [US1] Create `ExampleSelector` component at `frontend/src/components/ExampleSelector/` with card grid showing available examples
- [ ] T006 [US2] Add confirmation dialog when loading example over non-empty canvas
- [ ] T007 [US3] Add "Examples" button to header in App.tsx that toggles the ExampleSelector overlay
- [ ] T008 [US1] Show example cards on empty canvas state (in Canvas or as overlay)

## Phase 4: Integration & Polish

- [ ] T009 Wire up example loading: ExampleSelector -> loadExample + setChatInput in App.tsx
- [ ] T010 Add tests for ExampleSelector component
