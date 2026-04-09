# Implementation Plan: Expanded Component Library + Scalability

**Branch**: `005-expanded-palette` | **Date**: 2026-04-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/005-expanded-palette/spec.md`

## Summary

Expand the component palette from 5 to 18 types organized by category (Compute, Data, Messaging, Network, Clients), add lucide-react icons, category colors, collapsible palette sections, and scalability annotations (replica count) with AI-aware prompt construction. Refactor existing node components to use a data-driven registry pattern.

## Technical Context

**Language/Version**: TypeScript 5.x (frontend), Go 1.24 (backend — minor prompt changes only)
**Primary Dependencies**: Existing stack + lucide-react (new — icon library)
**Storage**: None (session-only per ADR-005)
**Testing**: Vitest (frontend), go test (backend — prompt/analyzer updates), Playwright (E2E)
**Target Platform**: Browser
**Project Type**: Web application — frontend-heavy milestone with minor backend prompt changes
**Performance Goals**: 18 node types render without lag; palette scrolls smoothly
**Constraints**: Backwards compatible with existing 5 types; BaseNode pattern must scale to 18 types without 18 separate component files
**Scale/Scope**: Single developer, frontend-heavy

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Collaborator, Not Judge | PASS | AI references scaling in collaborative tone |
| II. Graph Semantics Over Pixels | PASS | Replica count is semantic metadata, not visual decoration |
| III. Skateboard First | PASS | 18 types is the full v1 library — expanding the skateboard |
| IV. The Prompt Is the Product | PASS | Prompt includes replica counts and component roles per type |
| V. ADRs Are the Meta-Play | PASS | No new architectural decisions |
| Development Workflow | PASS | Existing lint/test/build pipeline |
| Product Boundaries | PASS | User draws, AI reasons about typed components |

All gates pass.

## Project Structure

### Source Code (new/modified files)

```text
frontend/src/
├── types/
│   └── graph.ts                       # MODIFIED: expand ComponentType to 18, add categories, add replicaCount
├── components/
│   ├── NodeTypes/
│   │   ├── BaseNode.tsx               # MODIFIED: accept icon prop, show replica badge
│   │   ├── NodeTypes.css              # MODIFIED: 5 category colors, replica badge styles
│   │   ├── index.ts                   # MODIFIED: data-driven registry for 18 types
│   │   ├── ServiceNode.tsx            # REMOVED (replaced by registry)
│   │   ├── DatabaseNode.tsx           # REMOVED (replaced by registry)
│   │   ├── CacheNode.tsx              # REMOVED (replaced by registry)
│   │   ├── QueueNode.tsx              # REMOVED (replaced by registry)
│   │   └── LoadBalancerNode.tsx       # REMOVED (replaced by registry)
│   └── Palette/
│       ├── Palette.tsx                # MODIFIED: categories, collapsible sections, icons
│       └── Palette.css                # MODIFIED: category headers, collapse animation
├── services/
│   └── graphSerializer.ts             # MODIFIED: include replicaCount in serialization
└── hooks/
    └── useGraphState.ts               # MODIFIED: support updateNodeData with replicaCount

backend/internal/
├── model/
│   └── graph.go                       # MODIFIED: add ReplicaCount field to GraphNode
├── graph/
│   ├── analyzer.go                    # MODIFIED: include replica counts in topology analysis
│   └── prompt.go                      # MODIFIED: reference scaling in natural language summary
└── ws/
    └── message.go                     # MODIFIED: GraphNode gains ReplicaCount field
```

**Structure Decision**: Replace 5 individual node component files with a data-driven registry. Each of the 18 types is defined as a config entry (type, label, icon, category, supportsReplicas) and the BaseNode renders them all. This avoids 18 nearly-identical component files.

## ADR Impact

No ADRs need to be created or superseded. This extends existing patterns.

## Complexity Tracking

No constitution violations. No complexity justification needed.
