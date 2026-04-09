# Data Model: AI Responds

## Overview

This milestone introduces WebSocket communication and AI streaming. All data remains in-memory (no persistence per ADR-005). The key new entities are WebSocket messages, the graph-to-prompt transformation, and the chat message history.

## Entities

### WebSocket Message Envelope

Bidirectional JSON messages between frontend and backend.

| Field | Type | Description |
|-------|------|-------------|
| type | string | Message type discriminator |
| payload | object | Type-specific payload (deferred deserialization) |
| requestId | string | Optional correlation ID for request/response pairs |

### Client → Server Message Types

**analyze_request**: User clicked "Ask AI"

| Field | Type | Description |
|-------|------|-------------|
| graphState | GraphState | Current graph serialization (from Milestone 2) |

### Server → Client Message Types

**ai_chunk**: A piece of the streaming AI response

| Field | Type | Description |
|-------|------|-------------|
| requestId | string | Correlates to the originating request |
| delta | string | Text chunk from the AI |

**ai_done**: AI response is complete

| Field | Type | Description |
|-------|------|-------------|
| requestId | string | Correlates to the originating request |

**error**: Something went wrong

| Field | Type | Description |
|-------|------|-------------|
| requestId | string | Correlates to the originating request (if applicable) |
| message | string | User-friendly error description |

### TopologyAnalysis

Pre-computed graph properties used in prompt construction. Computed server-side from GraphState.

| Field | Type | Description |
|-------|------|-------------|
| entryPoints | string[] | Node names with zero incoming edges |
| leafNodes | string[] | Node names with zero outgoing edges |
| fanIn | map[string, int] | Incoming edge count per node |
| fanOut | map[string, int] | Outgoing edge count per node |
| singlePointsOfFailure | string[] | Nodes whose removal disconnects the graph |
| cycles | string[][] | Lists of node names forming cycles |
| connectedComponents | int | Number of disconnected subgraphs |
| edgeProtocols | map[string, int] | Count of edges by label (protocol) |
| nodesByType | map[string, int] | Count of nodes by component type |

### ChatMessage (frontend)

A message displayed in the chat panel.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique message ID |
| role | "user" \| "assistant" | Who generated this message |
| content | string | The message text (grows during streaming) |
| status | "streaming" \| "complete" \| "error" | Current state of the message |
| timestamp | number | When the message was created |

### ConnectionStatus (frontend)

| Value | Description |
|-------|-------------|
| connecting | Initial connection attempt in progress |
| connected | WebSocket connection is open |
| disconnected | Connection lost, not attempting reconnect |
| reconnecting | Connection lost, backoff reconnect in progress |

## State Transitions

### WebSocket Connection

```
connecting → connected (onopen)
connected → disconnected (onclose/onerror)
disconnected → reconnecting (auto-backoff starts)
reconnecting → connected (reconnect succeeds)
reconnecting → disconnected (max retries exceeded)
```

### ChatMessage

```
streaming → complete (ai_done received)
streaming → error (error message received or connection lost)
```

## Relationships

- An `analyze_request` contains a `GraphState` (from Milestone 2's serializer)
- A `TopologyAnalysis` is derived from a `GraphState` (computed server-side)
- Each `ai_chunk` appends to the `content` of the active `ChatMessage`
- `ChatMessage` list is ordered by `timestamp` (session-only, not persisted)
