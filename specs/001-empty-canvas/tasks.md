# Tasks: Empty Canvas

**Input**: Design documents from `/specs/001-empty-canvas/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: The spec does not explicitly request TDD. A health check test is included as part of the backend setup since it validates the only contract in this milestone.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/` and `frontend/` at repository root (per ADR-006)

---

## Phase 1: Setup

**Purpose**: Initialize both projects and establish the monorepo structure

- [x] T001 Scaffold React/Vite/TypeScript frontend via `npm create vite@latest frontend -- --template react-ts`
- [x] T002 [P] Initialize Go module in `backend/` with `go mod init github.com/shadowbane1000/designpair`
- [x] T003 [P] Create root Makefile with targets: `dev`, `frontend-dev`, `backend-dev`, `lint`, `test`, `build-all`, `frontend-lint`, `frontend-test`, `frontend-build`, `backend-lint`, `backend-test`, `backend-build`

**Checkpoint**: Both projects initialized. `cd frontend && npm run dev` serves the Vite starter. `cd backend && go build ./...` succeeds (even if no code yet).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Configure tooling that all user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Configure strict TypeScript in `frontend/tsconfig.json` (enable `strict: true`, `noUncheckedIndexedAccess: true`)
- [x] T005 [P] Configure ESLint 9 flat config in `frontend/eslint.config.js` with `typescript-eslint`, `react-hooks`, `react-refresh` plugins
- [x] T006 [P] Configure golangci-lint v2 in `backend/.golangci.yml` with `govet`, `staticcheck`, `errcheck`, `gosimple`, `unused` linters
- [x] T007 [P] Install Vitest in `frontend/` and create a placeholder test in `frontend/src/__tests__/app.test.tsx`

**Checkpoint**: Foundation ready. `make lint` and `make test` run for both languages (even if tests are trivial).

---

## Phase 3: User Story 1 — View the Canvas (Priority: P1)

**Goal**: An interactive React Flow canvas fills the viewport, supporting pan and zoom

**Independent Test**: Open `http://localhost:5173` — the canvas fills the browser, responds to pan (click-drag) and zoom (scroll), no console errors.

### Implementation for User Story 1

- [x] T008 [US1] Install `@xyflow/react` in `frontend/` via `npm install @xyflow/react`
- [x] T009 [US1] Create Canvas component in `frontend/src/components/Canvas/Canvas.tsx` — a `<ReactFlow>` wrapper with empty nodes/edges arrays, pan and zoom enabled, full-viewport styling
- [x] T010 [US1] Import required React Flow CSS in `frontend/src/components/Canvas/Canvas.tsx` (or a shared styles entry point)
- [x] T011 [US1] Update `frontend/src/App.tsx` to render the Canvas component as the full-page layout
- [x] T012 [US1] Remove Vite starter boilerplate from `frontend/src/App.tsx` and `frontend/src/App.css`

**Checkpoint**: `make frontend-dev` → canvas renders full-viewport, pan and zoom work, no console errors.

---

## Phase 4: User Story 2 — Start the Application (Priority: P1)

**Goal**: `make dev` starts both frontend and backend services with a single command

**Independent Test**: Run `make dev` from repo root. Frontend at `http://localhost:5173` loads the canvas. Backend at `http://localhost:8081/health` returns `{"status":"ok"}`.

### Implementation for User Story 2

- [x] T013 [US2] Create Go backend entry point in `backend/cmd/designpair/main.go` — HTTP server listening on `:8081`
- [x] T014 [US2] Implement server setup in `backend/internal/server/server.go` — `New()` constructor, `GET /health` route returning `{"status":"ok"}`, graceful shutdown
- [x] T015 [US2] Write health check test in `backend/internal/server/server_test.go` — table-driven test verifying `GET /health` returns 200 with expected JSON body
- [x] T016 [US2] Implement `make dev` target in `Makefile` — starts both `frontend-dev` and `backend-dev` concurrently (e.g., using background processes or `&`)
- [x] T017 [P] [US2] Create frontend Dockerfile in `frontend/Dockerfile` — multi-stage build: `node:20-alpine` builder, `nginx:alpine` runtime, copies built assets to nginx html dir
- [x] T018 [P] [US2] Create backend Dockerfile in `backend/Dockerfile` — multi-stage build: `golang:1.26-alpine` builder with `CGO_ENABLED=0`, `gcr.io/distroless/static-debian12` runtime

**Checkpoint**: `make dev` starts both services. Health check responds. Dockerfiles build successfully via `make build-all`.

---

## Phase 5: User Story 3 — CI Validates Changes (Priority: P2)

**Goal**: Gitea Actions pipeline runs lint + test + build for both languages on every push

**Independent Test**: Push a commit. Verify the pipeline triggers and all steps pass. Introduce a lint error, push, verify it fails.

### Implementation for User Story 3

- [x] T019 [US3] Update `.gitea/workflows/ci.yaml` — add a `lint-test-build` job that runs before the existing `deploy-adrs` job: install Node.js + Go, run `make lint`, `make test`, build both Docker images
- [ ] T020 [US3] Verify CI pipeline runs end-to-end by pushing the branch and confirming all steps pass on Gitea

**Checkpoint**: CI pipeline passes. Lint, test, and build run for both frontend and backend.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup and validation

- [x] T021 [P] Add a `.gitignore` at repo root covering `node_modules/`, `dist/`, Go build artifacts, `.env`
- [x] T022 [P] Update `README.md` with setup instructions matching `specs/001-empty-canvas/quickstart.md`
- [ ] T023 Run `specs/001-empty-canvas/quickstart.md` validation — follow the quickstart from a clean state and verify every step works

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - US1 (Canvas) and US2 (Backend + Dev workflow) can proceed in parallel after Foundational
  - US3 (CI) depends on both US1 and US2 being complete (needs code to lint/test/build)
- **Polish (Phase 6)**: Depends on all user stories being complete

### Within Each User Story

- Models/components before integration
- Core implementation before Dockerfiles
- Story complete before moving to next priority

### Parallel Opportunities

- T001, T002, T003 can all run in parallel (Setup)
- T004, T005, T006, T007 can all run in parallel (Foundational)
- US1 (T008–T012) and the backend portion of US2 (T013–T015) can run in parallel
- T017 and T018 (Dockerfiles) can run in parallel with each other
- T021 and T022 (Polish) can run in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (Canvas)
4. **STOP and VALIDATE**: Open browser, verify canvas renders with pan/zoom
5. Continue to remaining stories

### Incremental Delivery

1. Setup + Foundational → both projects initialized with tooling
2. US1 → Canvas renders in browser (visual validation)
3. US2 → Backend serves health check, `make dev` works, Docker images build
4. US3 → CI validates everything on push
5. Polish → README, gitignore, quickstart validation

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
