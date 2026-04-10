# ADR-010: Client-Side Delta-Driven Auto-Analysis

**Status:** Accepted
**Date:** 2026-04-09
**Deciders:** Tyler Colbert

## Context

DesignPair's AI collaborator currently responds only when the user explicitly sends a message. In a real pairing session, a senior engineer would naturally comment on changes as they happen -- "oh, I see you added a database, but it's a single point of failure without replicas." This proactive feedback loop is missing.

We need a mechanism for the AI to automatically analyze meaningful changes to the architecture without requiring the user to ask. This must avoid being annoying (triggering on every pixel drag) and must provide focused feedback (not repeating full reviews).

## Decision

Implement auto-analyze as a client-side feature with these key design choices:

1. **Client-side structural change detection**: Compare serialized graph snapshots (excluding position data) to detect meaningful changes. The existing `serializeGraph` function provides the right abstraction.

2. **Client-side delta computation**: Compute the diff between the current graph and the last-analyzed snapshot on the client, sending the pre-computed delta to the backend. The backend does not store per-session graph state.

3. **Client-side debouncing**: Use a 2-second debounce timer that resets on each structural change. Only fire after changes settle.

4. **New `auto_analyze_request` message type**: Separate from `chat_message` to allow the backend to use a delta-focused prompt variant without complicating existing handlers.

5. **Observational only**: Auto-analysis does not invoke tool_use. It provides feedback text, not diagram suggestions. This keeps auto-analysis lightweight and non-disruptive.

## Rationale

- **Client-side detection avoids unnecessary traffic**: The client knows the difference between a drag event and a node addition. Filtering on the client means the WebSocket only carries meaningful requests.
- **Client-side delta avoids backend state**: The backend is stateless per ADR-005. If the backend computed deltas, it would need to store per-session graph snapshots, adding complexity and state management concerns.
- **Separate message type keeps handlers clean**: The auto-analyze handler uses a different prompt strategy (delta-focused) and does not need tool definitions. Mixing this into `chat_message` would require conditional branching.
- **2-second debounce balances responsiveness and batching**: Short enough to feel responsive, long enough to batch add-node + connect-edge sequences.
- **No tool_use keeps auto-analysis lightweight**: Proactive suggestions that modify the diagram could be confusing and disruptive. The user should explicitly ask for changes. Auto-analysis is for observation and feedback.

## Alternatives Considered

- **Server-side change detection**: Backend compares consecutive requests. Requires backend state and doesn't solve the drag-vs-structural problem (client would still need to filter).
- **Event-based detection (React Flow onChange)**: Listen to React Flow change events. Problematic because drag events fire continuously and event types are an implementation detail that could change.
- **Reuse `chat_message` with a flag**: Add an `isAutoAnalysis: boolean` to the existing chat_message payload. Would work but mixes concerns -- the handler needs different prompt logic, different validation (no empty text check), and different response labeling.
- **Auto-analyze with tool_use**: Let the AI suggest diagram changes proactively. Rejected as too disruptive -- unsolicited suggestions appearing on the diagram would be confusing. Users should ask for changes.

## Consequences

### Positive
- The AI becomes proactive -- provides feedback without being asked, like a real pairing partner
- Delta-focused feedback is more relevant and less repetitive than full re-analysis
- Client-side architecture keeps the backend stateless (consistent with ADR-005)
- Toggle + debounce prevent the feature from being annoying
- Manual messages always take priority -- user intent is respected

### Negative
- Additional frontend complexity: debounce logic, delta computation, state machine
- Auto-analyze counts toward turn limit, which could be consumed faster
- Delta computation adds a small overhead to each structural change (comparing snapshots)
- Two prompt variants (full analysis vs delta-focused) to maintain

### Mitigations
- State machine is simple (disabled/idle/pending/analyzing) with clear transitions
- Turn consumption is the correct behavior -- the user opted in to auto-analyze
- Snapshot comparison is O(n) where n is node+edge count; negligible for <50 nodes
- Prompt variants share the same base system prompt; delta context is an addendum

## Related ADRs

- ADR-005: No Persistence v1 (auto-analyze state is session-only)
- ADR-008: Graph-to-Prompt Hybrid (auto-analyze extends the prompt with delta context)
- ADR-009: AI Tool Use (auto-analyze explicitly does NOT use tools)
