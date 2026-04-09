# Contract: Graph State v3 (extends v2)

## Changes from v2

- `SerializedEdge` gains `protocol`, `direction`, and `syncAsync` fields
- Old edges without these fields default to unlabeled/oneWay/sync

## Edge Schema (updated)

```typescript
interface SerializedEdge {
  id: string
  source: string
  target: string
  label: string           // Protocol label text
  protocol?: string       // NEW: 'http' | 'grpc' | 'sql' | 'tcp' | 'async' | 'pubsub' | 'websocket' | 'mqtt' | 'custom'
  direction?: string      // NEW: 'oneWay' | 'bidirectional' (default: 'oneWay')
  syncAsync?: string      // NEW: 'sync' | 'async' (default: derived from protocol)
}
```

## Example

```json
{
  "nodes": [
    { "id": "n1", "type": "apiGateway", "name": "Gateway", "position": { "x": 100, "y": 50 } },
    { "id": "n2", "type": "service", "name": "API", "position": { "x": 300, "y": 50 }, "replicaCount": 3 },
    { "id": "n3", "type": "messageQueue", "name": "Orders Queue", "position": { "x": 500, "y": 50 } },
    { "id": "n4", "type": "service", "name": "Worker", "position": { "x": 700, "y": 50 } }
  ],
  "edges": [
    { "id": "e1", "source": "Gateway", "target": "API", "label": "HTTP", "protocol": "http", "direction": "oneWay", "syncAsync": "sync" },
    { "id": "e2", "source": "API", "target": "Orders Queue", "label": "async", "protocol": "async", "direction": "oneWay", "syncAsync": "async" },
    { "id": "e3", "source": "Orders Queue", "target": "Worker", "label": "async", "protocol": "async", "direction": "oneWay", "syncAsync": "async" },
    { "id": "e4", "source": "API", "target": "Gateway", "label": "WebSocket", "protocol": "websocket", "direction": "bidirectional", "syncAsync": "async" }
  ]
}
```
