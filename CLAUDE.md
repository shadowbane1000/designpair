# CLAUDE.md — Project Instructions for Claude Code

## Project

DesignPair — Interactive architecture canvas with a real-time AI collaborator. Monorepo with TypeScript/React frontend and Go backend.

## Key Files

- `docs/architecture.md` — System overview, data flow, component library
- `docs/roadmap.md` — Phased development plan
- `docs/adr/` — Architecture Decision Records
- `.specify/memory/constitution.md` — Project principles and boundaries

## Stack

- **Frontend:** TypeScript, React, React Flow (canvas), Vite (build)
- **Backend:** Go
- **Communication:** WebSocket (bidirectional, real-time)
- **LLM:** Anthropic Claude API (streaming via SSE, forwarded over WebSocket)
- **Persistence:** None in v1 — browser memory only
- **Deployment:** Docker Compose, self-hosted

## Monorepo Layout

- `frontend/` — React app (TypeScript, Vite)
- `backend/` — Go API server (WebSocket + LLM integration)
- `docs/adr/` — Architecture Decision Records
- `prompts/` — Curated design challenge prompts
- Makefile at root with targets for both: `make frontend-lint`, `make backend-test`, `make build-all`

## Conventions

### Go (backend/)
- `cmd/` + `internal/` layout, same as ADR Insight
- Every external dependency behind a Go interface
- Idiomatic Go: explicit error handling, short variable names in small scopes
- Lint with golangci-lint

### TypeScript (frontend/)
- Strict TypeScript — no `any` types
- Functional React components with hooks
- Custom hooks for WebSocket and graph state management
- Lint with ESLint, format with Prettier

### Both
- CI runs on Gitea Actions and GitHub Actions: lint + test + build for both languages
- ADRs for every significant decision (same format as ADR-001 through ADR-006)

## When Making Decisions

Write an ADR in `docs/adr/`. ADRs are a core part of the portfolio value — same philosophy as ADR Insight.

## Current Phase

Phase 1 — Walking Skeleton. See `docs/roadmap.md` for the full breakdown. Immediate next steps:

1. Initialize monorepo: Go module + React/Vite project + Dockerfiles
2. React Flow canvas with 4–5 custom node types (Service, Database, Cache, Queue, Load Balancer)
3. Component palette with drag-to-canvas
4. Graph state serialization to JSON
5. Go WebSocket server
6. Anthropic streaming integration
7. End-to-end: draw → ask AI → streaming response in chat panel
8. CI pipeline (Gitea + GitHub Actions)

## The Core Technical Challenge

The quality of DesignPair depends on how well the graph state (nodes + edges JSON) is translated into a prompt the LLM can reason about architecturally. This is where the real engineering work is — not just "here's a list of nodes" but structured topology analysis the LLM can act on.

Examples of what the AI should detect:
- **Single points of failure:** "All three services connect to one database with no read replicas"
- **Missing components:** "You have a public-facing API with no load balancer or rate limiting"
- **Consistency implications:** "This queue between service A and B means eventual consistency — is that acceptable for this flow?"
- **Scaling bottlenecks:** "Your write path goes through a single service with no horizontal scaling pattern"
- **Pattern recognition:** "This looks like CQRS — you have separate read and write paths. But the read path isn't using a cache."

Prompt construction must go beyond "here's a list of nodes and edges." It must include:
- Graph topology summary (fan-out, fan-in, depth, cycles)
- Data flow direction
- Component types and their typical architectural roles
- Connection patterns and protocols
- Any user-provided annotations or context

## Testing

- Frontend: React Testing Library for components, unit tests for graph serialization logic
- Backend: Table-driven Go tests, integration tests for WebSocket handling and prompt construction
- Don't chase coverage — test the graph-to-prompt logic and WebSocket message flow thoroughly

## Tyler's Level

Tyler is learning Go (second project, growing proficiency) and refreshing TypeScript/React. He's an expert systems architect with 25+ years experience. Help him write idiomatic code in both languages, flag non-idiomatic patterns, but don't over-explain architectural concepts.

## Active Technologies
- TypeScript 5.x (frontend), Go 1.24+ (backend) + React 19, React Flow 12, Vite 6 (frontend); net/http (backend) (001-empty-canvas)
- None (no persistence in this milestone) (001-empty-canvas)

## Recent Changes
- 001-empty-canvas: Added TypeScript 5.x (frontend), Go 1.24+ (backend) + React 19, React Flow 12, Vite 6 (frontend); net/http (backend)
