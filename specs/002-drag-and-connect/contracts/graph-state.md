# Contract: Graph State JSON

## Purpose

The serialized graph state is the primary data contract for DesignPair. It represents the complete architecture diagram as structured JSON. In Milestone 3, this JSON will be sent to the backend via WebSocket for AI analysis.

## Schema

```typescript
interface GraphState {
  nodes: SerializedNode[];
  edges: SerializedEdge[];
}

interface SerializedNode {
  id: string;        // UUID
  type: string;      // ComponentType: "service" | "database" | "cache" | "queue" | "loadBalancer"
  name: string;      // User-editable display name
  position: {
    x: number;
    y: number;
  };
}

interface SerializedEdge {
  id: string;        // UUID
  source: string;    // Source node ID
  target: string;    // Target node ID
  label: string;     // Connection label (empty string if not set)
}
```

## Example

```json
{
  "nodes": [
    { "id": "a1b2c3", "type": "loadBalancer", "name": "LB", "position": { "x": 100, "y": 50 } },
    { "id": "d4e5f6", "type": "service", "name": "API", "position": { "x": 300, "y": 50 } },
    { "id": "g7h8i9", "type": "database", "name": "Users DB", "position": { "x": 500, "y": 50 } }
  ],
  "edges": [
    { "id": "e1", "source": "a1b2c3", "target": "d4e5f6", "label": "HTTP" },
    { "id": "e2", "source": "d4e5f6", "target": "g7h8i9", "label": "SQL" }
  ]
}
```

## Invariants

- `nodes` array contains zero or more nodes (empty diagram is valid)
- `edges` array contains zero or more edges
- Every edge's `source` and `target` reference an existing node `id`
- No edge has `source === target`
- All `id` values are unique within their respective arrays
- `type` is one of the 5 defined ComponentType values
- `name` is a non-empty string
- `label` is a string (may be empty)
