# Quickstart: Connections and Flow Refinement

## Development

```bash
export ANTHROPIC_API_KEY=sk-ant-...
make dev
```

## New Connection Features

### Connecting Nodes

Drag from any handle on one node to any handle on another. The arrow shows data flow direction based on which handle you dragged from.

### Setting Protocol

1. Click on an edge
2. A context menu appears with protocol options: HTTP, gRPC, SQL, TCP, async, pub/sub, WebSocket, MQTT, or custom text
3. Select a protocol — the edge changes color and line style (solid=sync, dashed=async)

### Direction Controls

- **Reverse**: Flip the arrow direction
- **Bidirectional**: Toggle to show arrows on both ends
- **Sync/Async override**: Toggle the sync/async classification (overrides protocol default)

### Protocol Colors

- Sync protocols: blue (HTTP), indigo (gRPC), purple (SQL), slate (TCP) — solid lines
- Async protocols: green (async), teal (pub/sub), amber (WebSocket), cyan (MQTT) — dashed lines

### AI Analysis

The AI now includes protocol-aware analysis:
- Sync chain depth (latency/failure cascade risk)
- Async boundaries (eventual consistency implications)
- Bidirectional dependencies (tight coupling)
- Protocol distribution

## Testing

```bash
make lint && make test && make e2e
```
