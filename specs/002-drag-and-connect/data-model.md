# Data Model: Drag and Connect

## Overview

All data lives in React component state (in-memory). No persistence. The graph state is the central data structure — a collection of typed nodes and directed edges, serializable to JSON.

## Entities

### ComponentType (enum)

The 5 architecture component types available in the palette.

| Value | Category | Description |
|-------|----------|-------------|
| service | Compute | A service/microservice |
| database | Data | A database (SQL or NoSQL) |
| cache | Data | An in-memory cache |
| queue | Messaging | A message queue |
| loadBalancer | Network | A load balancer |

### ArchitectureNode

A typed architecture component placed on the canvas. Extends React Flow's `Node<T>`.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier (UUID) |
| type | ComponentType | One of the 5 component types |
| position | { x: number, y: number } | Canvas position |
| data.label | string | User-editable display name (defaults to type name) |

### ArchitectureEdge

A directed connection between two nodes. Extends React Flow's `Edge<T>`.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier (UUID) |
| source | string | Source node ID |
| target | string | Target node ID |
| data.label | string | Optional connection label (e.g., "HTTP", "async") |

### GraphState (serialized JSON)

The complete graph representation, output by the serializer.

```json
{
  "nodes": [
    {
      "id": "uuid",
      "type": "service",
      "name": "API Gateway",
      "position": { "x": 100, "y": 200 }
    }
  ],
  "edges": [
    {
      "id": "uuid",
      "source": "node-id-1",
      "target": "node-id-2",
      "label": "HTTP"
    }
  ]
}
```

## Validation Rules

- Node `id` must be unique across all nodes
- Edge `id` must be unique across all edges
- Edge `source` and `target` must reference existing node IDs
- Edge `source` must not equal `target` (no self-connections)
- Node `data.label` must be a non-empty string
- Edge `data.label` may be empty (optional)

## Relationships

- A Node has zero or more outgoing Edges (source)
- A Node has zero or more incoming Edges (target)
- An Edge connects exactly one source Node to one target Node
- Deleting a Node cascades to delete all connected Edges

## State Transitions

No complex state machines. Nodes and edges are created, updated (name/label), and deleted.
