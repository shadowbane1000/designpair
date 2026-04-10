# DesignPair

Interactive architecture canvas with a real-time AI collaborator.

**Live demo:** [designpair.colberts.us](https://designpair.colberts.us)

You diagram your system by dragging and connecting components, and the AI engages as you build — asking probing questions, flagging risks, and suggesting improvements. It's a thinking partner for architectural work, not a scoring tool or diagram generator.

## Features

- **18 component types** across 5 categories (Compute, Data, Messaging, Network, Clients), each with distinct icons and category-colored borders
- **Protocol-aware connections** — 8 predefined protocols (HTTP, gRPC, SQL, TCP, async, pub/sub, WebSocket, MQTT) plus custom text, with visual distinction between sync and async (solid vs dashed), bidirectional edges, and per-edge color coding
- **AI tool-use collaboration** — the AI suggests diagram changes (add/delete/modify nodes and edges) that appear as pending suggestions with visual treatment (green glow for adds, red strikethrough for deletes). Approve or discard all at once.
- **Pattern recognition** — detects CQRS, event sourcing, saga, fan-out, API gateway, microservices, and monolith patterns from graph topology, feeding them into the prompt for pattern-aware feedback
- **Auto-analyze mode** — optional proactive analysis that fires on structural changes, observing the delta since last analysis rather than re-reviewing the full graph
- **Curated examples** — pre-built architectures (e-commerce microservices, real-time chat, URL shortener, IoT pipeline) with suggested questions, loadable with one click
- **Component annotations** — click any node to add notes the AI considers during analysis
- **Conversation memory with summarization** — long conversations are compressed via a summarization call to stay within context window, preserving key decisions and identified issues
- **Export/import** — save and load diagrams as JSON files
- **Auto-layout** — AI-added nodes are positioned using dagre-based layout to avoid overlap and integrate naturally into existing diagrams

## The Graph-to-Prompt Challenge

This is the core engineering problem. The quality of AI feedback depends entirely on how well a visual diagram is translated into a structured prompt the AI can reason about architecturally. A naive approach — "here's a list of nodes and edges" — produces generic advice. DesignPair constructs a multi-layered prompt that gives the AI genuine architectural insight.

### What the AI receives

Given a diagram, the backend runs a topology analyzer that computes:

- **Entry points and leaf nodes** — components with no incoming or outgoing connections
- **Fan-in / fan-out** — identifies potential bottlenecks (high fan-in) and coupling risks (high fan-out)
- **Single points of failure** — articulation point detection (removing which node disconnects the graph?)
- **Cycle detection** — circular dependencies via DFS coloring
- **Sync chain depth** — how many synchronous hops deep a request travels (latency and failure cascade risk)
- **Async boundaries** — where eventual consistency begins
- **Connected components** — disconnected subgraphs that may indicate missing connections
- **Pattern recognition** — higher-level patterns detected from structural analysis (see below)

### Pattern detection

The analyzer detects seven architectural patterns from graph structure alone:

| Pattern | Detection logic |
|---|---|
| **CQRS** | Separate services writing to a primary DB and reading from a cache |
| **Event Sourcing** | Services publishing to an event bus/stream with 2+ consumers |
| **Saga** | 3+ services coordinating through async messaging |
| **Fan-out** | One node distributing to 3+ same-type targets |
| **API Gateway** | Gateway/LB routing to 2+ services with client connections |
| **Microservices** | 3+ services with dedicated (non-shared) data stores |
| **Monolith** | Single service handling all data store and client connections |

### Three-view prompt format

When the AI has pending suggestions (proposed but not yet approved changes), the prompt provides three views so the AI can reason about the transition:

1. **Current Architecture** — the committed diagram state
2. **Proposed Changes** — list of pending add/delete/modify operations
3. **Architecture After Approval** — what the diagram will look like if approved

This prevents the AI from re-suggesting changes it already proposed and lets it build on pending suggestions across multiple conversation turns.

### Example: what the AI actually sees

Given a simple diagram with a Web Client connecting to an API Gateway, which routes to an Order Service and User Service, both writing to a shared SQL Database:

```
## Architecture Overview

The diagram contains 5 component(s) and 4 connection(s).

### Components
- **Web Client** (webClient)
- **API Gateway** (apiGateway)
- **Order Service** (service)
- **User Service** (service)
- **Orders DB** (databaseSql)

### Connections
- Web Client → [HTTP] → API Gateway
- API Gateway → [HTTP] → Order Service
- API Gateway → [HTTP] → User Service
- Order Service → [SQL] → Orders DB
- User Service → [SQL] → Orders DB

### Topology Analysis
- **Entry points** (no incoming connections): Web Client
- **Leaf nodes** (no outgoing connections): Orders DB
- **High fan-in**: Orders DB has 2 incoming connections (potential bottleneck)
- **Single points of failure**: API Gateway, Orders DB
- **Connection types**: HTTP (3), SQL (2)

### Connection Analysis
- **Sync chain depth**: 3 hops (latency and failure cascade risk)

### Detected Architectural Patterns
- **API Gateway**: API Gateway serves as a single entry point routing to backend services
  - API Gateway routes to 2 backend services
  - Web Client connects through API Gateway
```

The AI sees the shared database as a single point of failure, the 3-hop sync chain as a latency risk, and the API Gateway pattern — producing feedback like *"Both services share Orders DB with no read replicas. If that database goes down, both Order Service and User Service are unavailable. Have you considered database-per-service, or at minimum a read replica for the User Service's read path?"*

## Stack

- **Frontend:** TypeScript 5.x, React 19, @xyflow/react 12, Vite 6
- **Backend:** Go 1.24, net/http, github.com/coder/websocket, anthropic-sdk-go
- **Communication:** WebSocket (bidirectional, real-time streaming)
- **LLM:** Anthropic Claude API (streaming via SSE, tool use for diagram suggestions)
- **Persistence:** None — browser memory only (per [ADR-005](docs/adr/ADR-005-no-persistence-v1.md))
- **Deployment:** Docker Compose, self-hosted

## Quick Start

```bash
git clone https://github.com/shadowbane1000/designpair.git
cd designpair
cd frontend && npm install && cd ..
ANTHROPIC_API_KEY=your-key-here make dev
```

Frontend runs at http://localhost:5173, backend at http://localhost:8081.

```bash
make lint    # ESLint + golangci-lint
make test    # Vitest + go test
```

## Architecture

See [docs/architecture.md](docs/architecture.md) for the full system overview, including the graph-to-prompt pipeline, WebSocket message protocol, and subsystem breakdown.

## Decision Records

Every significant design decision is documented as an ADR in [docs/adr/](docs/adr/):

- [ADR-001](docs/adr/ADR-001-typescript-and-go.md) — TypeScript + Go language choice
- [ADR-002](docs/adr/ADR-002-react-flow-canvas.md) — React Flow for canvas
- [ADR-003](docs/adr/ADR-003-anthropic-for-collaboration.md) — Anthropic Claude for AI collaboration
- [ADR-004](docs/adr/ADR-004-websocket-realtime.md) — WebSocket for real-time communication
- [ADR-005](docs/adr/ADR-005-no-persistence-v1.md) — No persistence in v1
- [ADR-006](docs/adr/ADR-006-monorepo.md) — Monorepo structure
- [ADR-007](docs/adr/ADR-007-coder-websocket.md) — coder/websocket library
- [ADR-008](docs/adr/ADR-008-graph-to-prompt-hybrid.md) — Hybrid prompt format
- [ADR-009](docs/adr/ADR-009-ai-tool-use-collaboration.md) — AI tool-use collaboration
- [ADR-010](docs/adr/ADR-010-auto-analyze-proactivity.md) — Auto-analyze proactivity
- [ADR-011](docs/adr/ADR-011-pattern-recognition.md) — Pattern recognition
- [ADR-012](docs/adr/ADR-012-conversation-memory.md) — Conversation memory with summarization

## Why This Project Exists

This is the second portfolio project for Tyler Colbert (alongside [ADR Insight](https://github.com/shadowbane1000/adrinsight)), targeting Principal Engineer / Staff+ roles. Together the two projects demonstrate:

| | ADR Insight | DesignPair |
|---|---|---|
| **Language** | Go | TypeScript (React) + Go |
| **AI pattern** | RAG (retrieve + synthesize) | Real-time conversational (streaming analysis + tool use) |
| **Interaction** | Text query → text answer | Visual canvas → streaming AI dialogue with diagram editing |
| **Domain** | Decision documentation | System architecture design |
