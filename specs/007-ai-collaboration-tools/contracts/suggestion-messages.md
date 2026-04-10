# Contract: Suggestion WebSocket Messages

## New Server → Client Message Types

### suggestion

Sent when the AI invokes a tool. Contains the tool name, parameters, and result.

```json
{
  "type": "suggestion",
  "payload": {
    "tool": "add_node",
    "params": {
      "type": "cache",
      "name": "Redis Cache"
    },
    "result": "success",
    "error": null
  },
  "requestId": "req-uuid"
}
```

### suggestion (error)

Sent when a tool call is invalid.

```json
{
  "type": "suggestion",
  "payload": {
    "tool": "add_node",
    "params": { "type": "cache", "name": "Redis Cache" },
    "result": "error",
    "error": "Node name 'Redis Cache' already exists"
  },
  "requestId": "req-uuid"
}
```

## Message Flow

1. User sends `chat_message` with graph state (committed + pending)
2. AI streams text (`ai_chunk`) and tool calls
3. For each tool call: backend validates, sends `suggestion` message to frontend
4. Backend sends `tool_result` back to Claude for continuation
5. Claude may produce more text/tools based on tool results
6. `ai_done` signals end of response

## Frontend Handling

- On `suggestion` with `result: "success"`: add to SuggestionSet, apply flattening, update display
- On `suggestion` with `result: "error"`: display error in chat (AI will see the error and adjust)
