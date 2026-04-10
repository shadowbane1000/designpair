# Research: AI Collaboration Tools

## Anthropic Tool Use with Streaming (Go SDK)

- **Decision**: Use Claude's tool_use feature with streaming via anthropic-sdk-go
- **Rationale**: Native API support for function calling. Tools defined in MessageNewParams, streamed as content_block_start/delta/stop events interleaved with text.
- **Key patterns**:
  - Tool definitions: `[]ToolUnionParam` with `ToolParam{Name, Description, InputSchema}`
  - Streaming: `content_block_start` with `type: "tool_use"` signals a tool call. `content_block_delta` with `type: "input_json_delta"` streams the JSON input. `content_block_stop` signals completion.
  - Text + tools interleaved: Claude produces text blocks and tool_use blocks sequentially in the same response. `StopReason` is `"tool_use"` when tools are called.
  - Multiple tools: Claude can call multiple tools per response, each as a separate content block with unique ID.
  - Tool results: Send back as `tool_result` content blocks in a user message, then re-call Claude for continuation.
- **Alternatives considered**: Custom prompt-based "function calling" with JSON parsing (fragile, no streaming support)

## Tool Definitions (6 tools)

| Tool | Parameters | Constraints |
|------|-----------|-------------|
| add_node | type, name, position? | Name must be unique. Type from 18 ComponentType values. |
| delete_node | name | Must exist in committed or pending-add state. Cascades to edges. |
| modify_node | name, changes: {name?, replicaCount?} | Cannot change type. New name must be unique. |
| add_edge | source, target, protocol?, direction?, syncAsync? | Must not duplicate existing (source, target, protocol, direction). |
| delete_edge | source, target, protocol, direction | Must match existing edge. |
| modify_edge | source, target, protocol, direction, changes: {protocol?, direction?, syncAsync?} | Cannot change source/target. New values must not create duplicate. |

## Pending State Architecture

- **Decision**: Separate overlay structure alongside committed nodes/edges
- **Rationale**: Keeps committed state clean. Approve = merge additions + apply deletions + apply modifications. Discard = clear the overlay.
- **Structure**:
  ```
  SuggestionSet {
    additions: { nodes: PendingNode[], edges: PendingEdge[] }
    deletions: { nodeIds: string[], edgeIds: string[] }
    modifications: { nodes: NodeModification[], edges: EdgeModification[] }
  }
  ```
- **Display**: `useMemo` merges committed + pending, tags each item with `pendingStatus` in data prop for rendering
- **Alternatives considered**: Flags on node/edge data (pollutes committed state, messy approve logic)

## Visual Treatment

| Status | Node | Edge |
|--------|------|------|
| Pending add | Green glow (`drop-shadow(0 0 8px green)`) | Green glow + green color |
| Pending delete | Red glow + strikethrough name | Red color + strikethrough label (or × if no label) |
| Pending modify | Changed field shows "old → new" | Changed field shows "old → new" |
| Committed | Normal | Normal |

## Coincident Edge Offset

- **Decision**: Apply 15-20px perpendicular offset to pending-add edge when coincident with pending-delete
- **Rationale**: Both edges need to be visible for the user to understand the swap
- **Pattern**: Detect coincidence by matching (source, target) pair. Pass offset via edge data. Custom edge component shifts control points.

## Auto-Positioning New Nodes

- **Decision**: Position at midpoint of connected nodes, offset 150-200px in available direction
- **Rationale**: Places new nodes contextually near their connections
- **Fallback**: If no connections specified, place 200px below the last-interacted-with node, or center of viewport

## Three-View Prompt

- **Decision**: Prompt includes three sections: Current Architecture, Proposed Changes, Architecture After Approval
- **Rationale**: Gives AI full context to reason about both current state and pending state without confusion
- **Format**:
  1. Current Architecture: committed nodes/edges only (existing topology analysis)
  2. Proposed Changes: list of pending operations (ADD node X, DELETE edge Y, MODIFY edge Z protocol HTTP→gRPC)
  3. Architecture After Approval: merged view (committed + adds - deletes + modifications)

## Node Name Uniqueness

- **Decision**: Enforce unique node names across committed + pending state
- **Rationale**: Enables AI tool calls to reference nodes by name unambiguously
- **Pattern**: Auto-append "(2)", "(3)" etc. for default names. Block user rename to existing name with visual error.

## Edge Uniqueness

- **Decision**: Edges unique by (source, target, protocol, direction) across committed + pending state
- **Rationale**: Prevents ambiguous edge references in AI tool calls. All states count for uniqueness. Adding a duplicate pending-delete edge cancels the deletion (flattening).

## WebSocket Message Flow for Tool Calls

- **Decision**: Backend processes tool calls and sends `suggestion` messages to frontend
- **Flow**:
  1. Claude streams text (forwarded as `ai_chunk`) + tool_use blocks
  2. Backend accumulates tool call JSON from `input_json_delta` events
  3. On `content_block_stop` for a tool_use block, backend validates and sends `suggestion` message to frontend
  4. Backend constructs `tool_result` and continues Claude conversation for potential follow-up text/tools
  5. Frontend receives `suggestion` messages and adds to SuggestionSet
