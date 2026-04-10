# Data Model: AI Collaboration Tools

## Overview

This milestone introduces a pending suggestions overlay, tool call processing, and uniqueness constraints. The core data model separates committed diagram state from pending AI suggestions.

## New Entities

### PendingStatus (enum — frontend rendering only)

| Value | Visual Treatment |
|-------|-----------------|
| committed | Normal rendering |
| pendingAdd | Green glow |
| pendingDelete | Red + strikethrough/× |
| pendingModify | "old → new" on changed fields |

### SuggestionSet (frontend state)

The accumulated collection of pending suggestions.

| Field | Type | Description |
|-------|------|-------------|
| additions.nodes | PendingNode[] | Nodes to add (with position, type, name, data) |
| additions.edges | PendingEdge[] | Edges to add (with source, target, protocol, etc.) |
| deletions.nodeIds | string[] | IDs of committed nodes to delete |
| deletions.edgeIds | string[] | IDs of committed edges to delete |
| modifications.nodes | NodeModification[] | Node property changes |
| modifications.edges | EdgeModification[] | Edge property changes |

### NodeModification

| Field | Type | Description |
|-------|------|-------------|
| nodeId | string | ID of the node to modify |
| oldValues | { name?, replicaCount? } | Original values (for "old → new" display) |
| newValues | { name?, replicaCount? } | New values |

### EdgeModification

| Field | Type | Description |
|-------|------|-------------|
| edgeId | string | ID of the edge to modify |
| oldValues | { protocol?, direction?, syncAsync? } | Original values |
| newValues | { protocol?, direction?, syncAsync? } | New values |

### ToolCall (WebSocket message — server → client)

Sent when the AI invokes a tool during streaming.

| Field | Type | Description |
|-------|------|-------------|
| type | "suggestion" | Message type |
| payload.tool | string | Tool name (add_node, delete_node, etc.) |
| payload.params | object | Tool parameters |
| payload.error | string? | Error message if tool call was invalid |
| requestId | string | Correlation ID |

## Updated Entities

### ArchitectureNodeData (frontend)

| Field | Type | Description |
|-------|------|-------------|
| label | string | Display name (MUST be unique across committed + pending) |
| replicaCount | number? | Replica count |
| pendingStatus | PendingStatus? | Rendering hint (derived, not stored) |
| pendingOldValues | object? | For modify: original values to show "old → new" |

### ArchitectureEdgeData (frontend)

| Field | Type | Description |
|-------|------|-------------|
| label | string | Protocol label |
| protocol | EdgeProtocol? | Protocol type |
| direction | EdgeDirection? | One-way or bidirectional |
| syncAsync | SyncAsync? | Sync or async |
| pendingStatus | PendingStatus? | Rendering hint (derived, not stored) |
| pendingOldValues | object? | For modify: original values to show "old → new" |
| edgeOffset | number? | Pixel offset for coincident edges |

## Uniqueness Constraints

### Node Names
- Unique across committed + pending state
- Auto-suffix "(2)", "(3)" on creation if default name exists
- Block rename to existing name

### Edges
- Unique by (source, target, protocol, direction) across committed + pending state
- All states count (committed, pending-add, pending-delete)
- Adding duplicate of pending-delete cancels the deletion (flattening)

## Flattening Rules

Flattening operates on **same-identity** operations only. It does NOT auto-infer modify from delete+add sequences with different properties — the AI uses `modify_node`/`modify_edge` explicitly for property changes.

**Node identity**: by name (unique).
**Edge identity**: by (source, target, protocol, direction).

| Action | Existing State | Result |
|--------|---------------|--------|
| Add node (same name) | Node pending-delete | Cancel deletion |
| Add node (different name) | Node pending-delete | Two separate operations (delete old + add new) |
| Delete node | Node pending-add | Remove the pending add |
| Modify node | Node pending-add | Apply modification to the pending add directly |
| Modify node | Node already pending-modify | Replace with newer modification |
| Add edge (same identity) | Edge pending-delete | Cancel deletion |
| Add edge (different identity) | Edge pending-delete | Two separate operations (delete old + add new) |
| Delete edge | Edge pending-add | Remove the pending add |
| Modify edge | Edge pending-add | Apply modification to the pending add directly |
| Modify edge | Edge already pending-modify | Replace with newer modification |
