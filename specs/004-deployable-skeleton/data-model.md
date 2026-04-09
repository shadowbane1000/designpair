# Data Model: Deployable Skeleton

## Overview

This milestone extends the M3 data model with freeform user messages and conversation history management. No new persistence — everything remains session-only.

## New/Modified Entities

### WebSocket Message: chat_message (Client → Server)

New message type for freeform user text input. Replaces `analyze_request` as the primary interaction.

| Field | Type | Description |
|-------|------|-------------|
| type | "chat_message" | Message type discriminator |
| payload.text | string | User's freeform question (empty string triggers default prompt) |
| payload.graphState | GraphState | Current graph serialization |
| requestId | string | Correlation ID |

### ConversationTurn (Backend internal)

A single turn in the conversation history, stored in memory per WebSocket connection.

| Field | Type | Description |
|-------|------|-------------|
| role | "user" \| "assistant" | Who generated this turn |
| content | string | The message text |

### ConversationManager (Backend internal)

Manages the sliding window of conversation history per connection.

| Field | Type | Description |
|-------|------|-------------|
| turns | []ConversationTurn | Ordered list of conversation turns |
| maxTokenEstimate | int | Approximate token budget for conversation (default ~120K) |

## State Transitions

### Conversation Flow

```
empty → user sends chat_message → backend appends user turn
→ backend assembles prompt (system + graph + history + user message)
→ streams AI response → backend appends assistant turn
→ ready for next user message
```

### Context Window Management

```
history within budget → send all turns
history exceeds budget → drop oldest turn pair (user + assistant)
→ re-check budget → repeat until within budget
→ send remaining turns
```

## Backwards Compatibility

- `analyze_request` message type continues to work (maps to empty-text chat_message internally)
- Existing E2E tests that use the Ask AI button will be updated to use the text input
