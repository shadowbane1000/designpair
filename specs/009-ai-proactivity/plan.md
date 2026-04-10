# Implementation Plan: AI Proactivity

**Branch**: `009-ai-proactivity` | **Date**: 2026-04-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/009-ai-proactivity/spec.md`

## Summary

Add an optional auto-analyze mode where the AI proactively comments on meaningful structural changes to the architecture diagram. The feature is toggled off by default, triggers are debounced to avoid noise, and the AI receives delta context (what changed since last analysis) to produce focused, relevant feedback rather than repeating full reviews.

## Technical Context

**Language/Version**: TypeScript 5.x (frontend), Go 1.24 (backend)
**Primary Dependencies**: React 19, @xyflow/react 12, Vite 6 (frontend); net/http, github.com/coder/websocket, anthropic-sdk-go (backend)
**Storage**: None (session-only per ADR-005)
**Testing**: Vitest + React Testing Library (frontend), Go table-driven tests (backend)
**Target Platform**: Web browser (desktop)
**Project Type**: Web application (monorepo)
**Performance Goals**: Auto-analyze triggers within 3 seconds of last structural change
**Constraints**: Must not trigger on cosmetic changes (drag, zoom, pan). Must debounce rapid changes.
**Scale/Scope**: Single-user session, no concurrent access concerns

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Collaborator, Not Judge | PASS | Auto-analysis provides collaborative feedback, not scores |
| II. Graph Semantics Over Pixels | PASS | Triggers on structural changes (nodes/edges), ignores position changes |
| III. Skateboard First | PASS | Feature is a toggle (off by default), does not block existing functionality |
| IV. The Prompt Is the Product | PASS | Delta-based prompting enhances the graph-to-prompt quality |
| V. ADRs Are the Meta-Play | PASS | Will create ADR for auto-analyze architecture decision |

## Project Structure

### Documentation (this feature)

```text
specs/009-ai-proactivity/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/
│   │   └── ChatPanel/
│   │       ├── ChatPanel.tsx         # Add auto-analyze toggle + auto message display
│   │       └── ChatPanel.css         # Toggle styling
│   ├── hooks/
│   │   ├── useAutoAnalyze.ts         # NEW: Auto-analyze orchestration hook
│   │   └── useGraphState.ts          # No changes needed
│   ├── services/
│   │   └── graphDelta.ts             # NEW: Delta computation between graph snapshots
│   └── types/
│       └── websocket.ts              # Add auto_analyze message type
└── src/__tests__/
    ├── useAutoAnalyze.test.ts        # NEW: Hook tests
    └── graphDelta.test.ts            # NEW: Delta computation tests

backend/
├── internal/
│   ├── ws/
│   │   ├── handler.go                # Handle auto_analyze_request message type
│   │   └── message.go                # Add AutoAnalyzePayload type
│   └── llm/
│       └── prompt.go                 # Add auto-analyze system prompt variant with delta context
└── internal/ws/
    └── handler_test.go               # Test auto_analyze_request handling
```

**Structure Decision**: Extends existing monorepo structure. New files are a custom hook for auto-analyze orchestration and a utility for graph delta computation. Backend changes are minimal -- new message type and a prompt variant.

## ADR Impact

| Existing ADR | Impact | Action |
|-------------|--------|--------|
| ADR-005 (No Persistence) | Auto-analyze state is session-only | Compatible, no action needed |
| ADR-009 (AI Tool Use) | Auto-analyze does not use tool_use | Compatible, no action needed |
| ADR-009 (Rate Limiting) | Auto-analyze respects rate limits | Compatible, no action needed |

## Complexity Tracking

No constitution violations. No complexity justifications needed.
