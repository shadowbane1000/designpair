# WebSocket Contract: Auto-Analyze

## New Message Type: `auto_analyze_request` (Client -> Server)

```json
{
  "type": "auto_analyze_request",
  "requestId": "uuid-string",
  "payload": {
    "graphState": {
      "nodes": [...],
      "edges": [...]
    },
    "delta": {
      "addedNodes": [{"type": "cache", "name": "Redis Cache"}],
      "removedNodes": [],
      "addedEdges": [{"source": "API", "target": "Redis Cache", "protocol": "tcp"}],
      "removedEdges": [],
      "modifiedNodes": [],
      "modifiedEdges": []
    },
    "pendingSuggestions": null
  }
}
```

### Fields

- `graphState`: Current full graph state (same format as chat_message)
- `delta`: What changed since last analysis. `null` on first auto-analysis (triggers full review)
- `pendingSuggestions`: Optional pending suggestions context (same format as chat_message)

## Response

Uses existing `ai_chunk` and `ai_done` message types. No new response types needed.

The `ai_done` payload includes an `isAutoAnalysis: true` field so the frontend can label it accordingly.

```json
{
  "type": "ai_done",
  "requestId": "uuid-string",
  "payload": {
    "requestId": "uuid-string",
    "turnsRemaining": 15,
    "isAutoAnalysis": true
  }
}
```
