# Implementation Plan: Drag and Connect

**Branch**: `002-drag-and-connect` | **Date**: 2026-04-08 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-drag-and-connect/spec.md`

## Summary

Add 5 custom architecture node types (Service, Database, Cache, Queue, Load Balancer) with a drag-and-drop palette, directed edge creation with labels, and a collapsible debug panel showing live JSON graph state. This builds on Milestone 1's empty React Flow canvas.

## Technical Context

**Language/Version**: TypeScript 5.x (frontend), Go 1.26+ (backend — unchanged)
**Primary Dependencies**: React 19, @xyflow/react 12 (custom nodes, custom edges), Vite 6
**Storage**: None (in-memory React state only)
**Testing**: Vitest + React Testing Library (graph serialization tests)
**Target Platform**: Browser
**Project Type**: Web application (frontend-only changes in this milestone)
**Performance Goals**: 10+ nodes and 15+ edges with no interaction lag; drag-to-canvas in single gesture
**Constraints**: Strict TypeScript; custom node types must use `Node<T>` generics; `nodeTypes`/`edgeTypes` defined outside components
**Scale/Scope**: Single developer, frontend-only milestone

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Collaborator, Not Judge | N/A | No AI interaction in this milestone |
| II. Graph Semantics Over Pixels | PASS | JSON serialization captures typed nodes and edges with topology — positions included for save/restore but AI will reason about topology per this principle |
| III. Skateboard First | PASS | 5 node types, basic edges, debug panel — minimum viable component set |
| IV. The Prompt Is the Product | N/A | No prompt construction yet (Milestone 3) |
| V. ADRs Are the Meta-Play | PASS | No new architectural decisions — builds on existing ADRs |
| Development Workflow | PASS | Lint + test + build maintained; graph serialization tests added |
| Product Boundaries | PASS | User draws, no AI generation — architecture-specific components |

All gates pass.

## Project Structure

### Documentation (this feature)

```text
specs/002-drag-and-connect/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (new/modified files)

```text
frontend/src/
├── components/
│   ├── Canvas/
│   │   └── Canvas.tsx           # Updated: custom nodeTypes/edgeTypes, drop handler
│   ├── Palette/
│   │   └── Palette.tsx          # NEW: draggable component list
│   ├── DebugPanel/
│   │   └── DebugPanel.tsx       # NEW: collapsible JSON state viewer
│   └── NodeTypes/
│       ├── ServiceNode.tsx      # NEW: custom node component
│       ├── DatabaseNode.tsx     # NEW: custom node component
│       ├── CacheNode.tsx        # NEW: custom node component
│       ├── QueueNode.tsx        # NEW: custom node component
│       ├── LoadBalancerNode.tsx  # NEW: custom node component
│       └── index.ts             # NEW: nodeTypes registry
├── hooks/
│   └── useGraphState.ts         # NEW: graph state management hook
├── types/
│   └── graph.ts                 # NEW: node/edge type definitions
├── services/
│   └── graphSerializer.ts       # NEW: graph-to-JSON serialization
└── App.tsx                      # Updated: layout with Palette + Canvas + DebugPanel
```

**Structure Decision**: Custom node components in `NodeTypes/` directory with a central registry (`index.ts`). Graph state managed via a custom hook that wraps React Flow's `useNodesState`/`useEdgesState`. Serialization logic in `services/` for testability.

## ADR Impact

| Existing ADR | Impact | Action |
|-------------|--------|--------|
| ADR-002 (React Flow Canvas) | Extending with custom nodes/edges | No change needed |

No ADRs need to be superseded.

## Complexity Tracking

No constitution violations. No complexity justification needed.
