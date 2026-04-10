# Research: AI Proactivity

## Debounce Strategy

**Decision**: Use a 2-second debounce timer on the client side. Reset the timer on each structural change. Fire the auto-analyze request when the timer expires.

**Rationale**: 2 seconds is long enough to batch rapid operations (add node + connect edge) but short enough to feel responsive. Client-side debouncing avoids unnecessary WebSocket traffic. The debounce timer is a simple `setTimeout`/`clearTimeout` pattern.

**Alternatives considered**:
- Server-side debouncing: Would require the client to send all changes and the server to decide when to analyze. More complex, and structural vs cosmetic filtering is easier on the client where React Flow state is available.
- Shorter debounce (500ms): Too aggressive -- would trigger mid-operation (e.g., user adds a node and is about to connect it).
- Longer debounce (5s): Too sluggish -- user waits too long for feedback.

## Structural Change Detection

**Decision**: Compare serialized graph state snapshots to detect structural changes. The `serializeGraph` function already excludes position data for edges and includes only meaningful data (type, name, connections, protocols). For nodes, compare everything except `position`.

**Rationale**: The existing `serializeGraph` function outputs `GraphState` which includes node type, name, position, replicaCount for nodes and source, target, label, protocol, direction, syncAsync for edges. We can compute a structural fingerprint by hashing the serialized state minus position fields.

**Alternatives considered**:
- Event-based detection (listening to onNodesChange/onEdgesChange events): React Flow fires many events for drag operations. Filtering these requires understanding each event type, which is fragile.
- Deep comparison of full node/edge arrays: More complex and would include React Flow internal state we don't care about.

## Delta Computation

**Decision**: Compute deltas by comparing the current serialized `GraphState` against a stored snapshot from the last analysis. Produce lists of added/removed/modified nodes and edges by ID.

**Rationale**: Simple set difference on node/edge IDs plus property comparison for modifications. The `GraphState` type already has all the data needed. Computing the delta client-side means the backend receives a pre-computed description of what changed.

**Alternatives considered**:
- Backend-side delta computation: Would require the backend to store per-session graph state, adding complexity and state management.
- Event log approach: Track every user action and replay the log. Over-engineered for this use case.

## Auto-Analyze Message Type

**Decision**: Add a new `auto_analyze_request` WebSocket message type with `graphState` and `delta` fields. The backend handles it similarly to `chat_message` but uses a different prompt prefix that instructs the AI to focus on the delta.

**Rationale**: Separate message type allows the backend to use a different prompt strategy (delta-focused) without complicating the existing chat_message handler. The response uses the same `ai_chunk`/`ai_done` flow.

**Alternatives considered**:
- Reuse `chat_message` with a flag: Would clutter the existing handler with conditional logic.
- Entirely new WebSocket endpoint: Over-engineered; one connection is sufficient.

## Queue and Priority

**Decision**: If the AI is streaming when a new auto-analyze trigger fires, queue it. If the user sends a manual message while an auto-trigger is pending, cancel the auto-trigger. Implement with a simple state machine in the `useAutoAnalyze` hook.

**Rationale**: Manual messages are intentional and should always take priority. The queue only needs depth of 1 (latest pending trigger replaces any earlier one).

**Alternatives considered**:
- Cancel streaming to serve the auto-trigger: Disruptive to user experience.
- Merge auto-trigger with manual message: Confusing UX -- user's question should be answered directly.
