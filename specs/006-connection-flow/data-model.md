# Data Model: Connections and Flow Refinement

## Overview

This milestone replaces the freeform text label on edges with a structured protocol model including protocol type, direction, and sync/async classification. Handles become bidirectional.

## Updated Entities

### EdgeProtocol (enum)

| Value | Label | Default Sync/Async | Color |
|-------|-------|-------------------|-------|
| http | HTTP | sync | #3b82f6 |
| grpc | gRPC | sync | #6366f1 |
| sql | SQL | sync | #8b5cf6 |
| tcp | TCP | sync | #64748b |
| async | async | async | #10b981 |
| pubsub | pub/sub | async | #14b8a6 |
| websocket | WebSocket | async | #f59e0b |
| mqtt | MQTT | async | #06b6d4 |
| custom | (user text) | sync | #9ca3af |

### EdgeDirection (enum)

| Value | Description |
|-------|-------------|
| oneWay | Single arrow from source to target (default) |
| bidirectional | Arrows on both ends |

### ArchitectureEdgeData (updated)

| Field | Type | Description |
|-------|------|-------------|
| label | string | Protocol label text (predefined or custom) |
| protocol | EdgeProtocol | Selected protocol type |
| direction | EdgeDirection | One-way or bidirectional |
| syncAsync | 'sync' \| 'async' | Defaults from protocol, user-overridable |

### SerializedEdge (updated)

| Field | Type | Description |
|-------|------|-------------|
| id | string | UUID |
| source | string | Source node name |
| target | string | Target node name |
| label | string | Protocol label |
| protocol | string | Protocol type |
| direction | string | 'oneWay' or 'bidirectional' |
| syncAsync | string | 'sync' or 'async' |

### Handle Configuration (per node)

Each position (top, bottom, left, right) has two overlapping handles:
- `{position}-source` (type="source")
- `{position}-target` (type="target")

Total: 8 handles per node (was 4). Visually appear as 4.

## Backend Updates

### GraphEdge (Go model, updated)

| Field | Type | JSON |
|-------|------|------|
| Protocol | string | `json:"protocol,omitempty"` |
| Direction | string | `json:"direction,omitempty"` |
| SyncAsync | string | `json:"syncAsync,omitempty"` |

### TopologyAnalysis (new fields)

| Field | Type | Description |
|-------|------|-------------|
| SyncChainDepth | int | Longest chain of sync connections from entry points |
| AsyncBoundaries | []string | Descriptions of sync→async transition points |
| BidirectionalEdges | []string | Node pairs with bidirectional connections |
| ProtocolDistribution | map[string]int | Edge count by protocol |

## Backwards Compatibility

- Edges with no protocol default to unlabeled (gray solid, sync)
- Existing edges continue to work — missing protocol/direction/syncAsync fields default to empty/oneWay/sync
