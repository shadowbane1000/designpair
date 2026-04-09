# Implementation Plan: Connections and Flow Refinement

**Branch**: `006-connection-flow` | **Date**: 2026-04-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/006-connection-flow/spec.md`

## Summary

Unify handles so any handle accepts connections in either direction, add protocol selection (8 predefined + custom) with sync/async visual styling (solid/dashed lines, protocol colors), bidirectional/one-way toggle, edge reversal, and protocol-aware AI analysis. Replaces the current freeform text label on edges with a structured protocol model.

## Technical Context

**Language/Version**: TypeScript 5.x (frontend), Go 1.24 (backend — prompt changes)
**Primary Dependencies**: Existing stack (no new deps)
**Storage**: None (session-only per ADR-005)
**Testing**: Vitest (frontend), go test (backend — prompt/analyzer), Playwright (E2E)
**Target Platform**: Browser
**Project Type**: Web application — frontend-heavy with backend prompt updates
**Performance Goals**: Edge interactions (protocol select, reverse, toggle) respond instantly
**Constraints**: Backwards compatible with existing edges (no protocol = default gray solid). Unified handles via dual source+target at same position with `connectionMode: 'loose'`.
**Scale/Scope**: Single developer, frontend-heavy

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Collaborator, Not Judge | PASS | AI reasons about sync/async and protocols in collaborative tone |
| II. Graph Semantics Over Pixels | PASS | Protocol and direction are semantic properties; visual styling derives from them |
| III. Skateboard First | PASS | 8 protocols covers the common cases; custom text handles the rest |
| IV. The Prompt Is the Product | PASS | Prompt includes protocol distribution, sync/async boundaries, chain depth |
| V. ADRs Are the Meta-Play | PASS | No new architectural decisions |
| Development Workflow | PASS | Existing lint/test/build pipeline |
| Product Boundaries | PASS | User draws connections, AI reasons about them |

All gates pass.

## Project Structure

### Source Code (new/modified files)

```text
frontend/src/
├── types/
│   └── graph.ts                          # MODIFIED: add EdgeProtocol, EdgeDirection, syncAsync to edge data
├── components/
│   ├── NodeTypes/
│   │   └── BaseNode.tsx                  # MODIFIED: dual handles (source+target at each position)
│   ├── EdgeTypes/
│   │   ├── LabeledEdge.tsx               # MODIFIED: protocol-aware rendering (color, dash, markers)
│   │   ├── EdgeTypes.css                 # MODIFIED: protocol colors, dashed styles
│   │   └── index.ts                      # UNCHANGED
│   └── EdgeContextMenu/
│       ├── EdgeContextMenu.tsx           # NEW: floating menu for protocol, direction, reverse
│       └── EdgeContextMenu.css           # NEW
├── services/
│   └── graphSerializer.ts                # MODIFIED: include protocol, direction, syncAsync in edges
├── hooks/
│   └── useGraphState.ts                  # MODIFIED: reverseEdge, toggleBidirectional helpers
└── App.tsx                               # MODIFIED: wire edge context menu

backend/internal/
├── model/
│   └── graph.go                          # MODIFIED: add Protocol, Direction, SyncAsync to GraphEdge
├── graph/
│   ├── analyzer.go                       # MODIFIED: sync/async boundary detection, protocol distribution
│   ├── analyzer_test.go                  # MODIFIED: tests for protocol-aware analysis
│   ├── prompt.go                         # MODIFIED: include protocol/sync/async in topology summary
│   └── prompt_test.go                    # MODIFIED: tests for protocol-aware prompt
└── ws/
    └── message.go                        # MODIFIED: GraphEdge gains Protocol, Direction, SyncAsync
```

**Structure Decision**: Protocol/direction/syncAsync stored as edge data properties. Custom edge component reads them for visual rendering. Floating context menu (not EdgeLabelRenderer) for protocol selection — better z-index and interaction handling.

## ADR Impact

No ADRs need to be created or superseded.

## Complexity Tracking

No constitution violations. No complexity justification needed.
