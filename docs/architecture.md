# DesignPair Architecture

## System Overview

```
┌──────────────────────────────────────────────────────────────┐
│                         Browser                               │
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────┐  │
│  │ React Flow Canvas │  │  AI Chat Panel   │  │ Suggestion│  │
│  │ (18 node types,   │  │  (streaming,     │  │ Overlay   │  │
│  │  protocol edges,  │  │   markdown,      │  │ (approve/ │  │
│  │  auto-layout)     │  │   auto-analyze)  │  │  discard) │  │
│  └────────┬──────────┘  └───────▲──────────┘  └─────▲─────┘  │
│           │                     │                    │        │
│           └──────── WebSocket ──┴────────────────────┘        │
│                         │                                     │
│  ┌──────────────────┐  │  ┌──────────────────┐               │
│  │ Graph Serializer │  │  │ Diagram IO       │               │
│  │ (state → JSON)   │  │  │ (export/import)  │               │
│  └──────────────────┘  │  └──────────────────┘               │
└────────────────────────┼─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                      Go Backend                               │
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐                  │
│  │  WebSocket       │  │  Rate Limiter    │                  │
│  │  Handler         │──│  (per-IP)        │                  │
│  └────────┬─────────┘  └──────────────────┘                  │
│           │                                                   │
│  ┌────────▼─────────┐  ┌──────────────────┐                  │
│  │  Graph Analyzer  │  │  Pattern         │                  │
│  │  (topology,      │──│  Detector        │                  │
│  │   fan-in/out,    │  │  (CQRS, saga,    │                  │
│  │   SPOF, cycles)  │  │   fan-out, etc.) │                  │
│  └────────┬─────────┘  └──────────────────┘                  │
│           │                                                   │
│  ┌────────▼─────────┐  ┌──────────────────┐                  │
│  │  Prompt Builder  │  │  Conversation    │                  │
│  │  (3-view format, │  │  Manager         │                  │
│  │   auto-analyze   │  │  (memory,        │                  │
│  │   delta)         │  │   summarization) │                  │
│  └────────┬─────────┘  └──────────────────┘                  │
│           │                                                   │
│  ┌────────▼─────────┐  ┌──────────────────┐                  │
│  │  LLM Client      │  │  Tool Validator  │                  │
│  │  (streaming +    │──│  (add/delete/    │                  │
│  │   tool use)      │  │   modify nodes   │                  │
│  └────────┬─────────┘  │   and edges)     │                  │
│           │            └──────────────────┘                  │
└───────────┼──────────────────────────────────────────────────┘
            │
            ▼
  ┌──────────────────┐
  │  Anthropic API   │
  │  (Claude)        │
  └──────────────────┘
```

## Data Flow

### User-initiated analysis

1. User drags components onto the canvas, connects them with protocol-aware edges
2. User types a question or clicks "Ask AI"
3. Frontend serializes graph state (nodes + edges + annotations + pending suggestions) as JSON
4. JSON is sent via WebSocket to the Go backend
5. Backend runs topology analysis: fan-in/out, single points of failure, cycle detection, sync chain depth, pattern recognition
6. Backend constructs a three-view prompt: current architecture + proposed changes + merged state (if pending suggestions exist)
7. Backend sends the prompt to Claude via streaming API with tool definitions
8. Each response chunk is forwarded via WebSocket to the frontend chat panel
9. If Claude uses tools (add_node, delete_node, etc.), the backend validates each tool call against the current graph state and sends suggestion messages to the frontend
10. Frontend renders pending suggestions with visual treatment (green glow / red strikethrough / old-to-new labels)
11. User approves or discards all suggestions at once

### Auto-analyze (proactive)

1. User enables auto-analyze toggle
2. Frontend debounces structural changes (not drag/position changes)
3. On structural change, frontend computes a delta (added/removed/modified nodes and edges) and sends it with the full graph state
4. Backend constructs a delta-aware prompt: full architecture overview + specific changes
5. Backend streams a brief (1-3 sentence) response using a separate system prompt optimized for brevity
6. Auto-analyze responses appear in the chat panel marked as proactive observations

### Conversation memory

1. Each WebSocket connection maintains a `ConversationManager` with a 120K token budget and 20-turn limit
2. When the conversation reaches 75% of the token budget, older turns are sent to Claude for summarization
3. The summary replaces older turns as a `[Conversation Summary]` user message
4. The 4 most recent turn pairs are always preserved verbatim
5. The system prompt instructs the AI to treat summary content as reliable context

## Frontend Subsystems

### Canvas (`frontend/src/components/Canvas/`)

- Built on @xyflow/react 12 with custom node and edge types
- 18 node types across 5 categories: Compute (service, apiGateway, loadBalancer, serverlessFunction), Data (databaseSql, databaseNosql, cache, objectStorage), Messaging (messageQueue, eventBus, streamProcessor), Network (cdn, dns, firewall), Clients (webClient, mobileClient, iotClient, externalApi)
- Each node type rendered via `BaseNode` component with category-colored borders and lucide-react icons
- Nodes support replica count annotations for scalable components
- Unified handles accept connections in either direction

### Edges (`frontend/src/components/EdgeTypes/`)

- `LabeledEdge` renders protocol labels, directional arrows, and sync/async visual distinction
- 8 predefined protocols (HTTP, gRPC, SQL, TCP, async, pub/sub, WebSocket, MQTT) with protocol-specific colors
- Solid lines for synchronous, dashed for asynchronous connections
- Bidirectional edges rendered with arrows on both ends
- Edge context menu for protocol, direction, and sync/async changes
- Edge reconnection via drag

### Suggestion overlay (`frontend/src/hooks/useSuggestions.ts`)

- Pending suggestions rendered as visual overlays on the canvas
- Green glow for proposed additions, red + strikethrough for proposed deletions
- "Old to new" labels for proposed modifications
- Suggestions accumulate across chat turns until approved or discarded
- Approve All / Discard All buttons in the chat panel

### Auto-layout (`frontend/src/services/autoLayout.ts`)

- Dagre-based layout for AI-added nodes
- Integrates new nodes into existing layout without disturbing user-placed components
- Smart edge routing selects handle positions based on relative node placement

### Diagram IO (`frontend/src/services/diagramIO.ts`)

- JSON export/import for saving and loading diagrams
- Graph serializer converts React Flow state to the backend's `GraphState` format

### Auto-analyze (`frontend/src/hooks/useAutoAnalyze.ts`)

- Debounced structural change detection
- Delta computation between graph snapshots (`frontend/src/services/graphDelta.ts`)
- Only fires on node/edge additions, removals, or property changes — not on position/drag events

### Example selector (`frontend/src/components/ExampleSelector/`)

- Pre-built example architectures stored as JSON in `frontend/src/data/examples.ts`
- Each example includes nodes, edges, and a suggested question for the AI
- Loading an example replaces the current canvas (with confirmation if non-empty)

### Annotations (`frontend/src/components/AnnotationPanel/`)

- Per-node text annotations visible to the AI during analysis
- Annotation context propagated to node rendering via `AnnotationContext`

## Backend Subsystems

### WebSocket handler (`backend/internal/ws/`)

- Accepts WebSocket connections with per-connection conversation state
- Message types: `chat_message`, `analyze_request`, `auto_analyze_request`, `reset_conversation`
- Response types: `ai_chunk` (streaming text), `ai_done`, `suggestion` (tool-use results), `validation_error`, `conversation_summarized`, `error`
- Validation gates run before every AI call: rate limiting, empty diagram check, node count cap (50), turn limit check

### Graph analyzer (`backend/internal/graph/analyzer.go`)

- Computes `TopologyAnalysis` from a `GraphState`:
  - Entry points (no incoming edges) and leaf nodes (no outgoing edges)
  - Fan-in / fan-out per node
  - Single points of failure via articulation point detection (node removal increases connected components)
  - Cycle detection via DFS with white/gray/black coloring
  - Connected component count (BFS on undirected graph)
  - Sync chain depth (longest path through synchronous-only edges)
  - Async boundaries (edges transitioning to asynchronous protocols)
  - Protocol and direction distribution
  - Scaled nodes (replica count > 1)

### Pattern detector (`backend/internal/graph/patterns.go`)

- Detects 7 architectural patterns from graph topology:
  - **CQRS**: separate services writing to primary DB and reading from cache
  - **Event Sourcing**: event bus/stream with producer and 2+ consumers
  - **Saga**: 3+ services coordinating through async messaging
  - **Fan-out**: one node distributing to 3+ same-type service targets
  - **API Gateway**: gateway/LB routing to 2+ services with client connections
  - **Microservices**: 3+ services with dedicated (non-shared) data stores
  - **Monolith**: single service handling all data store and client connections
- Each detected pattern includes evidence strings explaining what structural properties triggered detection

### Prompt builder (`backend/internal/graph/prompt.go`)

- `BuildPromptWithPending` generates a structured natural-language prompt with JSON appendix
- Sections: Architecture Overview, Components (with types, replicas, annotations), Connections (with protocols), Topology Analysis, Connection Analysis, Detected Architectural Patterns, Proposed Changes (if pending), Raw Graph Data (JSON)
- Positions are excluded per constitution Principle II (Graph Semantics Over Pixels)
- `BuildAutoAnalyzeUserMessage` constructs a delta-aware prompt for proactive analysis

### LLM client (`backend/internal/llm/`)

- `StreamWithTools`: sends messages with tool definitions, returns streaming text chunks and tool call results
- `StreamAnalysis`: sends messages without tools (used for auto-analyze)
- System prompt instructs the AI as a collaborative architect (not a judge), with topic boundaries limiting discussion to architecture
- Separate auto-analyze system prompt optimized for brevity (1-3 sentences)
- Tool definitions for 7 operations: `list_node_types`, `add_node`, `delete_node`, `modify_node`, `add_edge`, `delete_edge`, `modify_edge`
- Multi-turn tool loop (up to 10 turns) handles sequential tool calls in a single request

### Tool validation (`backend/internal/ws/handler.go`)

- Every tool call is validated against the current graph state before being sent to the frontend
- Validates: node name uniqueness, node/edge existence for delete/modify, duplicate edge prevention, replica count bounds
- Maintains a working copy of graph state within a request to validate sequential tool calls (e.g., add_node followed by add_edge referencing the new node)

### Conversation manager (`backend/internal/llm/conversation.go`)

- Per-connection conversation history with 120K token budget and 20-turn limit
- Token estimation: ~4 characters per token
- Summarization trigger: 75% of token budget
- Preserves 4 most recent turn pairs verbatim during summarization
- Fallback: drops oldest turn pairs if no summarizer is configured

### Rate limiter (`backend/internal/ratelimit/`)

- Per-IP rate limiting with configurable window and burst
- Returns retry-after duration for rate-limited requests

### Abuse hardening (`backend/internal/ws/handler.go`)

- Layered validation gates: rate limit → empty diagram → node count cap → turn limit
- Structured abuse logging for monitoring
- Validation errors sent as typed WebSocket messages with actionable user-facing text

## Component Library

18 component types organized by architectural role:

| Category | Types |
|---|---|
| **Compute** | Service, API Gateway, Load Balancer, Serverless Function |
| **Data** | Database (SQL), Database (NoSQL), Cache, Object Storage |
| **Messaging** | Message Queue, Event Bus, Stream Processor |
| **Network** | CDN, DNS, Firewall |
| **Clients** | Web Client, Mobile Client, IoT Client, External API |

Each component supports:
- Custom display name
- Optional text annotation (visible to the AI)
- Replica count (on supported types: service, apiGateway, databaseSql, databaseNosql, cache, objectStorage, messageQueue, streamProcessor)

## WebSocket Message Protocol

### Client to server

| Type | Payload | Description |
|---|---|---|
| `chat_message` | `{ text, graphState, pendingSuggestions }` | User message with current diagram state |
| `analyze_request` | `{ graphState }` | Legacy analyze button (compat) |
| `auto_analyze_request` | `{ graphState, delta }` | Proactive analysis with change delta |
| `reset_conversation` | `{}` | Clear conversation history |

### Server to client

| Type | Payload | Description |
|---|---|---|
| `ai_chunk` | `{ requestId, delta }` | Streaming text chunk |
| `ai_done` | `{ requestId, turnsRemaining?, isAutoAnalysis? }` | Response complete |
| `suggestion` | `{ tool, params, result, error }` | AI tool-use suggestion |
| `validation_error` | `{ requestId, code, message, retryAfter? }` | Pre-AI validation failure |
| `conversation_summarized` | `{ requestId, originalTurnCount, retainedTurnCount }` | Memory compression event |
| `error` | `{ requestId, message }` | General error |

## Deployment

- Docker Compose with two services: `frontend` (nginx serving Vite build) and `backend` (Go binary)
- Self-hosted at designpair.colberts.us
- No persistence layer — all state lives in the browser and WebSocket connection
- CI: Gitea Actions + GitHub Actions (lint + test + build for both languages)
