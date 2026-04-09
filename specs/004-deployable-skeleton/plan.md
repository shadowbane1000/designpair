# Implementation Plan: Deployable Skeleton

**Branch**: `004-deployable-skeleton` | **Date**: 2026-04-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/004-deployable-skeleton/spec.md`

## Summary

Add freeform text input replacing the "Ask AI" button, multi-turn conversation with context management, and deploy the complete application to `designpair.colberts.us` via Docker Compose with CI auto-deploy. This completes Phase 1 — the walking skeleton is live.

## Technical Context

**Language/Version**: TypeScript 5.x (frontend), Go 1.24 (backend)
**Primary Dependencies**: Existing stack + Docker Compose for deployment
**Storage**: None (session-only per ADR-005)
**Testing**: Vitest (frontend), go test (backend), Playwright (E2E)
**Target Platform**: Browser (frontend), Linux/Lightsail (backend + deployment)
**Project Type**: Web application — conversation features + production deployment
**Performance Goals**: First AI token in 3 seconds; page load under 5 seconds; deploy within 10 minutes of merge
**Constraints**: Single Lightsail server; frontend container routes all traffic (static + /ws proxy to backend); relative WebSocket URL (no build-time config)
**Scale/Scope**: Single developer, single concurrent user, self-hosted

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Collaborator, Not Judge | PASS | Multi-turn conversation deepens the collaborative experience |
| II. Graph Semantics Over Pixels | PASS | Current graph state sent with every request; AI reasons about topology |
| III. Skateboard First | PASS | Simple sliding window for context; no summarization complexity |
| IV. The Prompt Is the Product | PASS | Conversation history + fresh graph state assembled per request |
| V. ADRs Are the Meta-Play | PASS | No new architectural decisions — extending existing patterns |
| Development Workflow | PASS | CI auto-deploy extends existing pipeline |
| Product Boundaries | PASS | User draws, AI collaborates — deployed for portfolio access |

All gates pass.

## Project Structure

### Source Code (new/modified files)

```text
backend/
├── internal/
│   ├── ws/
│   │   ├── handler.go             # MODIFIED: accept freeform user text, manage conversation history
│   │   └── message.go             # MODIFIED: add user_message type with text field
│   └── llm/
│       └── conversation.go        # NEW: conversation history management, sliding window, message assembly

frontend/
├── src/
│   ├── components/
│   │   ├── ChatPanel/
│   │   │   ├── ChatPanel.tsx      # MODIFIED: add text input field, replace Ask AI button
│   │   │   └── ChatPanel.css      # MODIFIED: input field styles
│   │   └── Canvas/
│   │       └── Canvas.tsx         # MODIFIED: remove Ask AI button (moved to chat input)
│   ├── hooks/
│   │   └── useWebSocket.ts        # MODIFIED: relative WebSocket URL for deployment
│   └── App.tsx                    # MODIFIED: wire freeform input, remove Ask AI button logic

# Deployment
docker-compose.yml                 # NEW: frontend + backend services for production
docker/frontend-nginx.conf         # NEW: nginx config for frontend container (static + /ws proxy)
.gitea/workflows/ci.yaml           # MODIFIED: add deploy job for designpair.colberts.us
```

**Structure Decision**: Frontend nginx container handles all incoming traffic on port 8083 — serves static files and proxies `/ws` and `/health` to the backend container. Host nginx terminates TLS and proxies to 8083. This matches the single-upstream pattern used by adrinsight.

## ADR Impact

| Existing ADR | Impact | Action |
|-------------|--------|--------|
| ADR-005 (No Persistence) | Conversation history is session-only, as decided | No change needed |
| ADR-007 (coder/websocket) | WebSocket handler extended with conversation management | No change needed |
| ADR-008 (Graph-to-Prompt) | Graph state included with every turn; conversation context added | No change needed |

## Complexity Tracking

No constitution violations. No complexity justification needed.
