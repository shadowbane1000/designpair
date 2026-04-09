# Implementation Plan: Empty Canvas

**Branch**: `001-empty-canvas` | **Date**: 2026-04-08 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-empty-canvas/spec.md`

## Summary

Initialize the DesignPair monorepo with a React/Vite frontend rendering an interactive React Flow canvas and a Go backend serving a health check endpoint. Establish the developer workflow (`make dev`) and CI pipeline (Gitea Actions: lint + test + build for both languages).

## Technical Context

**Language/Version**: TypeScript 5.x (frontend), Go 1.24+ (backend)
**Primary Dependencies**: React 19, React Flow 12, Vite 6 (frontend); net/http (backend)
**Storage**: None (no persistence in this milestone)
**Testing**: Vitest (frontend), go test (backend)
**Target Platform**: Browser (frontend), Linux server (backend)
**Project Type**: Web application (monorepo: frontend + backend)
**Performance Goals**: Canvas pan/zoom at 60fps; backend health check < 50ms
**Constraints**: Strict TypeScript (no `any`); idiomatic Go with `cmd/` + `internal/` layout
**Scale/Scope**: Single developer, local development + CI

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Collaborator, Not Judge | N/A | No AI interaction in this milestone |
| II. Graph Semantics Over Pixels | N/A | No graph logic in this milestone |
| III. Skateboard First | PASS | Milestone 1 is the smallest vertical slice — empty canvas + health check + CI |
| IV. The Prompt Is the Product | N/A | No prompt construction in this milestone |
| V. ADRs Are the Meta-Play | PASS | Tech stack decisions already have ADRs 001–006 |
| Development Workflow | PASS | CI with lint + test + build for both languages; strict TS; idiomatic Go |
| Product Boundaries | PASS | Canvas foundation — no scoring, no generation, architecture-specific |

All gates pass. No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/001-empty-canvas/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/
│   │   └── Canvas/
│   │       └── Canvas.tsx       # React Flow canvas wrapper
│   ├── App.tsx                  # Root component
│   ├── main.tsx                 # Entry point
│   └── vite-env.d.ts
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── eslint.config.js
└── Dockerfile

backend/
├── cmd/
│   └── designpair/
│       └── main.go              # HTTP server entrypoint
├── internal/
│   └── server/
│       ├── server.go            # Server setup, routing
│       └── server_test.go       # Health check test
├── go.mod
├── go.sum
└── Dockerfile

Makefile                         # Developer interface (dev, lint, test, build targets)
.gitea/workflows/ci.yaml         # Updated with lint + test + build jobs
```

**Structure Decision**: Web application monorepo with `frontend/` and `backend/` at root, per ADR-006. The Makefile provides a unified developer interface across both languages.

## ADR Impact

| Existing ADR | Impact | Action |
|-------------|--------|--------|
| ADR-001 (TypeScript and Go) | Implementing the decision | No change needed |
| ADR-002 (React Flow Canvas) | Implementing the decision | No change needed |
| ADR-006 (Monorepo) | Implementing the decision | No change needed |

No ADRs need to be superseded.

## Complexity Tracking

No constitution violations. No complexity justification needed.
