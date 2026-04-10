# Implementation Plan: AI Collaboration Tools

**Branch**: `007-ai-collaboration-tools` | **Date**: 2026-04-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/007-ai-collaboration-tools/spec.md`

## Summary

Add 6 AI tools (add_node, delete_node, modify_node, add_edge, delete_edge, modify_edge) that create pending suggestions on the diagram. Suggestions accumulate across chat turns with visual treatment (green glow/red strikethrough/"old→new"), flattening for contradictions, and approve-all/discard-all workflow. Three-section prompt gives the AI committed, pending, and merged views. Node name uniqueness enforced. Edge uniqueness by (source, target, protocol, direction).

## Technical Context

**Language/Version**: TypeScript 5.x (frontend), Go 1.24 (backend)
**Primary Dependencies**: Existing stack + Anthropic SDK tool_use feature (no new library deps)
**Storage**: None (session-only per ADR-005)
**Testing**: Vitest (frontend — suggestion state, flattening), go test (backend — tool definitions, prompt), Playwright (E2E)
**Target Platform**: Browser (frontend), Linux server (backend)
**Project Type**: Web application — significant changes to both frontend state management and backend LLM integration
**Performance Goals**: Tool call suggestions appear on diagram within 2 seconds; approve/discard < 1 second
**Constraints**: Claude tool_use streaming emits content_block_start/delta/stop for tool calls interleaved with text. Multiple tool calls per response. Tool results sent back as tool_result blocks.
**Scale/Scope**: Single developer; most complex milestone to date

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Collaborator, Not Judge | PASS | AI suggests, user approves — core principle embodied |
| II. Graph Semantics Over Pixels | PASS | Tools operate on typed nodes/edges by name, not positions |
| III. Skateboard First | PASS | All-or-nothing approve; no per-suggestion or undo yet |
| IV. The Prompt Is the Product | PASS | Three-view prompt (committed, pending, merged) gives AI full context |
| V. ADRs Are the Meta-Play | PASS | Tool use pattern warrants an ADR |
| Development Workflow | PASS | Existing lint/test/build pipeline |
| Product Boundaries | PASS | AI collaborates by suggesting — user draws and decides |

All gates pass.

## Project Structure

### Source Code (new/modified files)

```text
backend/
├── internal/
│   ├── llm/
│   │   ├── client.go              # MODIFIED: add tool definitions to API call, handle tool_use streaming
│   │   ├── tools.go               # NEW: tool definitions (6 tools with schemas)
│   │   └── prompt.go              # MODIFIED: three-section prompt format
│   ├── ws/
│   │   ├── handler.go             # MODIFIED: process tool calls, send suggestion messages to frontend
│   │   └── message.go             # MODIFIED: add suggestion message types (tool_call, tool_result)
│   └── graph/
│       ├── prompt.go              # MODIFIED: three-view prompt builder (committed, pending, merged)
│       └── prompt_test.go         # MODIFIED: tests for three-view prompt

frontend/src/
├── types/
│   ├── graph.ts                   # MODIFIED: add pendingStatus to node/edge data, uniqueness helpers
│   └── suggestions.ts             # NEW: PendingSuggestion, SuggestionSet types
├── hooks/
│   ├── useGraphState.ts           # MODIFIED: unique name enforcement, unique edge enforcement
│   ├── useSuggestions.ts          # NEW: suggestion state, flattening, approve, discard
│   └── useWebSocket.ts           # UNCHANGED
├── components/
│   ├── NodeTypes/
│   │   ├── BaseNode.tsx           # MODIFIED: pending visual treatment (glow, strikethrough, old→new)
│   │   └── NodeTypes.css          # MODIFIED: pending styles
│   ├── EdgeTypes/
│   │   ├── LabeledEdge.tsx        # MODIFIED: pending visual treatment, coincident offset
│   │   └── EdgeTypes.css          # MODIFIED: pending styles
│   └── SuggestionBar/
│       ├── SuggestionBar.tsx      # NEW: Approve All / Discard All buttons + pending count
│       └── SuggestionBar.css      # NEW
└── App.tsx                        # MODIFIED: wire suggestions, pass to components, handle tool messages
```

**Structure Decision**: Pending suggestions stored as a separate overlay structure (not flags on committed state). A `useSuggestions` hook derives the display list by merging committed + pending, tagging items with `pendingStatus` for rendering. This keeps committed state clean and makes approve/discard trivial.

## ADR Impact

| Existing ADR | Impact | Action |
|-------------|--------|--------|
| ADR-008 (Graph-to-Prompt Hybrid) | Extended to three-view format | May need update or superseding ADR |

## Complexity Tracking

No constitution violations. No complexity justification needed.
