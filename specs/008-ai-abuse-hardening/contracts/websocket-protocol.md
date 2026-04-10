# WebSocket Protocol: Abuse Hardening Additions

**Branch**: `008-ai-abuse-hardening` | **Date**: 2026-04-09

## Overview

This document describes additions to the existing WebSocket protocol for abuse hardening. The existing message types (`chat_message`, `analyze_request`, `ai_chunk`, `ai_done`, `error`) are unchanged.

## New Server → Client Message Types

### `validation_error`

Sent when a pre-AI validation check fails. The request is rejected before any AI processing occurs.

```json
{
  "type": "validation_error",
  "payload": {
    "requestId": "abc-123",
    "code": "rate_limited",
    "message": "You're sending requests too quickly. Please wait 45 seconds before trying again.",
    "retryAfter": 45,
    "turnsRemaining": null
  },
  "requestId": "abc-123"
}
```

**Payload fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| requestId | string | yes | Echoed from client request |
| code | string (enum) | yes | Machine-readable error code |
| message | string | yes | Human-readable message for chat display |
| retryAfter | integer | no | Seconds until retry allowed (rate_limited only) |
| turnsRemaining | integer | no | Remaining turns (turn_limit_approaching only) |

**Error codes:**

| Code | Trigger | Example message |
|------|---------|-----------------|
| `rate_limited` | IP exceeded 10 requests per 2-minute window | "You're sending requests too quickly. Please wait {N} seconds before trying again." |
| `no_diagram` | GraphState has zero nodes | "Please add some components to your diagram before asking for feedback. The AI needs an architecture to analyze." |
| `too_many_nodes` | GraphState has >50 nodes | "Your diagram has {N} nodes, which exceeds the maximum of 50. Please simplify your architecture to get AI feedback." |
| `turn_limit` | Session has reached 20 turns | "You've reached the conversation limit for this session. Refresh the page to start a new conversation." |

### `turn_info` (embedded in `ai_done`)

Rather than a separate message type, turn information is added to the existing `ai_done` payload when the user is approaching the turn limit.

```json
{
  "type": "ai_done",
  "payload": {
    "requestId": "abc-123",
    "turnsRemaining": 4
  },
  "requestId": "abc-123"
}
```

**New field on `ai_done` payload:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| turnsRemaining | integer | no | Present when ≤5 turns remain. Omitted otherwise. |

## Validation Order

When a `chat_message` or `analyze_request` is received, the server validates in this order:

1. **Rate limit** → `rate_limited` if exceeded
2. **Diagram presence** → `no_diagram` if zero nodes
3. **Node count** → `too_many_nodes` if >50
4. **Turn limit** → `turn_limit` if ≥20 turns used

First failing check returns immediately. No subsequent checks run.

## Client Handling

The frontend should handle `validation_error` messages by:

1. Displaying the `message` field in the chat as a system/error message
2. Removing any streaming indicator (the AI will not respond)
3. For `rate_limited`: optionally disabling the send button for `retryAfter` seconds
4. For `turn_limit`: optionally disabling the input permanently until page refresh

For `ai_done` with `turnsRemaining`:
1. Display a subtle indicator showing remaining turns (e.g., "4 turns remaining")
2. Use warning styling when ≤3 turns remain

## Backward Compatibility

- Existing message types are unchanged
- `validation_error` is a new type; older clients that don't handle it will ignore it (standard WebSocket behavior — unrecognized types are dropped)
- `turnsRemaining` on `ai_done` is an optional new field; older clients that don't read it are unaffected
