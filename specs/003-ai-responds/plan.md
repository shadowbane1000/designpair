# Implementation Plan: AI Responds

**Branch**: `003-ai-responds` | **Date**: 2026-04-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-ai-responds/spec.md`

## Summary

Add WebSocket communication between frontend and Go backend, Anthropic Claude streaming integration, graph-to-prompt construction with topology analysis, and a chat panel displaying streamed AI architectural feedback. This is the core milestone — connecting the canvas to an AI collaborator.

## Technical Context

**Language/Version**: TypeScript 5.x (frontend), Go 1.24 (backend)
**Primary Dependencies**: @xyflow/react 12 (existing), coder/websocket (new), anthropic-sdk-go (new)
**Storage**: None (session-only chat history in React state)
**Testing**: Vitest (frontend), go test (backend — graph-to-prompt + WebSocket), Playwright (E2E)
**Target Platform**: Browser (frontend), Linux server (backend)
**Project Type**: Web application (both frontend and backend changes)
**Performance Goals**: First AI token in chat within 3 seconds; auto-reconnect within 10 seconds
**Constraints**: Anthropic API key on backend only; one AI request at a time; no freeform user input (Milestone 4)
**Scale/Scope**: Single developer, single concurrent user

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Collaborator, Not Judge | PASS | System prompt establishes collaborative architect tone — asks questions, suggests, doesn't score |
| II. Graph Semantics Over Pixels | PASS | Graph-to-prompt strips positions, reasons about topology (connections, fan-in/out, flow direction) |
| III. Skateboard First | PASS | One-button "Ask AI", no freeform input, no conversation history features beyond display |
| IV. The Prompt Is the Product | PASS | Pre-computed topology analysis (fan-in/out, SPOFs, entry/leaf nodes, cycles) + hybrid prompt format |
| V. ADRs Are the Meta-Play | PASS | WebSocket library choice warrants an ADR |
| Development Workflow | PASS | Lint + test + build for both languages; graph-to-prompt tests are the critical path |
| Product Boundaries | PASS | User draws, AI reasons — no generation, no scoring |

All gates pass.

## Project Structure

### Documentation (this feature)

```text
specs/003-ai-responds/
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
backend/
├── cmd/designpair/
│   └── main.go                    # MODIFIED: add WebSocket handler, LLM config
├── internal/
│   ├── server/
│   │   └── server.go              # MODIFIED: add WebSocket route, CORS
│   ├── ws/
│   │   ├── handler.go             # NEW: WebSocket upgrade, message routing
│   │   ├── handler_test.go        # NEW: WebSocket message handling tests
│   │   └── message.go             # NEW: typed message envelope
│   ├── llm/
│   │   ├── client.go              # NEW: Anthropic client interface + implementation
│   │   ├── client_test.go         # NEW: mock-based tests
│   │   └── prompt.go              # NEW: system prompt template
│   └── graph/
│       ├── analyzer.go            # NEW: topology analysis (fan-in/out, SPOFs, cycles, etc.)
│       ├── analyzer_test.go       # NEW: topology analysis tests
│       ├── prompt.go              # NEW: graph-to-prompt construction (hybrid format)
│       └── prompt_test.go         # NEW: prompt construction tests
├── go.mod                         # MODIFIED: add coder/websocket, anthropic-sdk-go
└── go.sum                         # MODIFIED

frontend/src/
├── hooks/
│   ├── useWebSocket.ts            # NEW: WebSocket client with auto-reconnect
│   └── useGraphState.ts           # MODIFIED: expose serialized state for sending
├── components/
│   ├── ChatPanel/
│   │   ├── ChatPanel.tsx          # NEW: conversation-style AI response display
│   │   └── ChatPanel.css          # NEW: chat panel styles
│   ├── Canvas/
│   │   └── Canvas.tsx             # MODIFIED: add "Ask AI" button
│   └── ConnectionStatus/
│       ├── ConnectionStatus.tsx   # NEW: connected/disconnected indicator
│       └── ConnectionStatus.css   # NEW
├── types/
│   └── websocket.ts               # NEW: typed WS message discriminated unions
└── App.tsx                        # MODIFIED: layout with ChatPanel, WebSocket provider
```

**Structure Decision**: Backend follows existing `internal/` layout with new packages: `ws/` for WebSocket handling, `llm/` for Anthropic client behind an interface, `graph/` for topology analysis and prompt construction. Frontend adds `useWebSocket` hook with auto-reconnect and typed messages.

## ADR Impact

| Existing ADR | Impact | Action |
|-------------|--------|--------|
| ADR-003 (Anthropic for Collaboration) | Implementing the decision | No change needed |
| ADR-004 (WebSocket Realtime) | Implementing the decision | No change needed |

## Complexity Tracking

No constitution violations. No complexity justification needed.
