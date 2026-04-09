# Contract: Chat Message (extends WebSocket Messages)

## New Client → Server Message

### chat_message

Sent when the user submits text in the chat input field.

```json
{
  "type": "chat_message",
  "payload": {
    "text": "What if I added a cache between the API and the database?",
    "graphState": {
      "nodes": [...],
      "edges": [...]
    }
  },
  "requestId": "req-uuid"
}
```

### Empty input behavior

The frontend substitutes the default text "Analyze my architecture" before sending. The backend always receives a non-empty `text` field — no special-casing needed server-side. This keeps the default prompt in one place (the frontend).

## Response Messages

Same as M3: `ai_chunk`, `ai_done`, `error` — no changes to server → client messages.

## Backwards Compatibility

The `analyze_request` message type from M3 continues to work. The backend treats it as a `chat_message` with empty text.

## Conversation Context

The backend maintains per-connection conversation history. Each `chat_message` adds a user turn; each completed AI response adds an assistant turn. The full history (within the context window budget) is included in the AI prompt.
