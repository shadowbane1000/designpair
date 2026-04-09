# Contract: Graph State v2 (extends v1)

## Changes from v1

- `type` field now accepts 18 values (was 5)
- `replicaCount` field added to nodes (optional, omitted when 1 or unsupported)

## Node Schema (updated)

```typescript
interface SerializedNode {
  id: string
  type: string       // Now one of 18 ComponentType values
  name: string
  position: { x: number; y: number }
  replicaCount?: number  // NEW: only present when > 1 and type supports replicas
}
```

## Example

```json
{
  "nodes": [
    { "id": "n1", "type": "loadBalancer", "name": "LB", "position": { "x": 100, "y": 50 } },
    { "id": "n2", "type": "service", "name": "API", "position": { "x": 300, "y": 50 }, "replicaCount": 3 },
    { "id": "n3", "type": "databaseSql", "name": "Users DB", "position": { "x": 500, "y": 50 } },
    { "id": "n4", "type": "cdn", "name": "Edge CDN", "position": { "x": 100, "y": 200 } },
    { "id": "n5", "type": "iotClient", "name": "Sensors", "position": { "x": 100, "y": 350 } }
  ],
  "edges": [
    { "id": "e1", "source": "n1", "target": "n2", "label": "HTTP" },
    { "id": "e2", "source": "n2", "target": "n3", "label": "SQL" }
  ]
}
```

## Backwards Compatibility

- Old 5-type graphs continue to work (type values unchanged)
- Nodes without `replicaCount` default to 1
- New types are additive — no existing type values change
