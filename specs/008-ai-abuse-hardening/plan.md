# Implementation Plan: AI Interface Abuse Hardening

**Branch**: `008-ai-abuse-hardening` | **Date**: 2026-04-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/008-ai-abuse-hardening/spec.md`

## Summary

Harden the publicly deployed DesignPair application against AI cost abuse by adding five server-side validation gates — rate limiting per IP, diagram presence check, node count cap (50), conversation turn limit, and topic-constrained system prompt — all enforced before any LLM invocation so rejected requests incur zero AI cost. Abuse events are logged with IP, event type, and timestamp.

## Technical Context

**Language/Version**: TypeScript 5.x (frontend), Go 1.24 (backend)
**Primary Dependencies**: React 19, @xyflow/react 12, Vite 6 (frontend); net/http, github.com/coder/websocket, anthropic-sdk-go (backend)
**Storage**: None (in-memory rate limit state, ephemeral per-connection session state — consistent with ADR-005)
**Testing**: Vitest (frontend), go test with table-driven tests (backend)
**Target Platform**: Linux server via Docker Compose; Nginx reverse proxy fronts the backend
**Project Type**: Web application (monorepo: frontend/ + backend/)
**Performance Goals**: All validation checks complete in <100ms; no degradation for legitimate users
**Constraints**: No authentication, no persistent storage, no external dependencies for rate limiting
**Scale/Scope**: Demo application; conservative rate limits appropriate for public showcase

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Collaborator, Not Judge | ✅ Pass | Topic constraints reinforce the collaborative architect role. Validation error messages are informative, not punitive. |
| II. Graph Semantics Over Pixels | ✅ Pass | Node count validation operates on graph structure (node count), not visual layout. Consistent with principle. |
| III. Skateboard First | ✅ Pass | All five measures are minimal implementations. In-memory rate limiter, simple counter for turns, node count check on existing GraphState. No over-engineering. |
| IV. The Prompt Is the Product | ✅ Pass | System prompt hardening improves prompt quality by constraining the AI to architecture topics where it delivers the most value. |
| V. ADRs Are the Meta-Play | ✅ Pass | Rate limiting strategy warrants an ADR documenting the in-memory approach and its trade-offs. |

**Gate result**: All principles pass. No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/008-ai-abuse-hardening/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── websocket-protocol.md
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── cmd/designpair/main.go          # Wire up rate limiter
├── internal/
│   ├── ratelimit/
│   │   ├── limiter.go              # NEW: IP-based sliding window rate limiter
│   │   └── limiter_test.go         # NEW: Table-driven tests
│   ├── ws/
│   │   ├── handler.go              # MODIFY: Add validation pipeline, turn tracking, abuse logging
│   │   ├── handler_test.go         # NEW: Validation gate tests
│   │   └── message.go              # MODIFY: Add validation error message types
│   ├── llm/
│   │   ├── prompt.go               # MODIFY: Add topic constraints to system prompt
│   │   └── conversation.go         # MODIFY: Add turn counting to ConversationManager
│   └── ipaddr/
│       ├── extract.go              # NEW: Client IP extraction (X-Forwarded-For / RemoteAddr)
│       └── extract_test.go         # NEW: Tests for IP extraction logic
│
frontend/
├── src/
│   ├── App.tsx                     # MODIFY: Handle validation error messages, pass turn info
│   ├── components/ChatPanel/
│   │   └── ChatPanel.tsx           # MODIFY: Display remaining turns indicator
│   └── types/websocket.ts          # MODIFY: Add validation error types
```

**Structure Decision**: All new code fits within the existing monorepo layout. One new Go package (`ratelimit`) for the rate limiter since it has independent state and lifecycle. One new package (`ipaddr`) for IP extraction since it's a reusable, testable utility. Validation orchestration stays in the WebSocket handler since that's the single entry point for all AI requests.

## ADR Impact

| Existing ADR | Impact | Action |
|-------------|--------|--------|
| ADR-003 (Anthropic for Collaboration) | System prompt gains topic-constraint language, reinforcing the existing collaborative role | No conflict — additive change |
| ADR-004 (WebSocket Communication) | New validation error message types added to the protocol | No conflict — additive change |
| ADR-005 (No Persistence v1) | Rate limit and turn state are in-memory only, consistent with this ADR | No conflict |

No existing ADRs need superseding.

## Complexity Tracking

No constitution violations to justify. All implementations use minimal approaches:
- Rate limiter: in-memory map, no external dependencies
- Turn counter: integer on existing ConversationManager
- Node count: len() check on existing GraphState.Nodes
- Diagram presence: nil/empty check on existing GraphState.Nodes
- Topic constraint: additional text in existing system prompt constant
