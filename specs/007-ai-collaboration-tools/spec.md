# Feature Specification: AI Collaboration Tools

**Feature Branch**: `007-ai-collaboration-tools`
**Created**: 2026-04-09
**Status**: Draft
**Input**: User description: "milestone 7"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - AI Suggests Diagram Changes (Priority: P1)

A user asks the AI to modify their architecture — "add a cache between the API and the database" or "suggest protocols for all connections." Instead of just describing what it would do, the AI directly calls tools (`add_node`, `add_edge`, `delete_edge`, `modify_node`, `modify_edge`) that create pending suggestions on the diagram. The user sees the proposed changes visually — new components glow green, removed items show red with strikethrough, and modifications display "old → new" labels. The AI explains its reasoning alongside the visual suggestions.

**Why this priority**: This is the defining feature of the milestone — transforming the AI from an advisor into an active collaborator that can make concrete suggestions on the diagram.

**Independent Test**: Build a diagram with Service → Database. Ask "add a cache between them." The AI calls add_node (Cache), add_edge (Service→Cache), add_edge (Cache→Database), delete_edge (Service→Database). Green-glowing Cache node and edges appear. The old Service→Database edge shows red strikethrough. The AI explains why caching helps.

**Acceptance Scenarios**:

1. **Given** a diagram and a user request to modify it, **When** the AI responds, **Then** it calls the appropriate tools to suggest changes and explains its reasoning
2. **Given** pending suggestions on the diagram, **When** the user views the canvas, **Then** pending adds glow green, pending deletes show red + strikethrough, and pending modifications show "old → new"
3. **Given** the AI is asked to "suggest protocols for all connections," **When** it responds, **Then** it calls `modify_edge` for each connection with appropriate protocols and the edges show the proposed changes
4. **Given** the AI wants to change a node's type, **When** it responds, **Then** it calls `delete_node` and `add_node` (not `modify_node`) because type changes require delete + add

---

### User Story 2 - Approve or Discard Suggestions (Priority: P1)

A user reviews the AI's suggested changes and decides to accept or reject them. Two buttons — "Approve All" and "Discard All" — appear when pending suggestions exist. Approving commits all pending changes to the diagram. Discarding removes all pending changes and reverts to the previous state. Suggestions accumulate across multiple chat turns until the user acts on them.

**Why this priority**: Equal priority with the suggestion mechanism — without approve/discard, suggestions are meaningless.

**Independent Test**: AI suggests adding a cache (3 operations). Click "Approve All" — the cache, edges, and deletion commit. The green/red visual treatment disappears and the diagram reflects the new state. Alternatively, click "Discard All" — the diagram reverts to before the suggestions.

**Acceptance Scenarios**:

1. **Given** pending suggestions exist, **When** the user clicks "Approve All," **Then** all pending adds become real nodes/edges, all pending deletes are executed, and all pending modifications are applied
2. **Given** pending suggestions exist, **When** the user clicks "Discard All," **Then** all pending changes are removed and the diagram reverts to its committed state
3. **Given** no pending suggestions, **When** the user views the toolbar, **Then** the Approve/Discard buttons are not visible
4. **Given** the AI makes suggestions in turn 1 and additional suggestions in turn 2, **When** the user views the diagram, **Then** all suggestions from both turns are accumulated and visible
5. **Given** pending suggestions exist, **When** the user continues chatting with the AI, **Then** the AI sees the pending state and can build upon or reference it

---

### User Story 3 - AI Sees Pending State (Priority: P2)

The AI receives the full context of pending changes in its prompt so it can reason about both the current committed state and the proposed changes. The prompt includes three sections: the current architecture (committed only), the proposed changes (pending operations), and the architecture after approval. This enables the AI to make follow-up suggestions that build on its previous proposals — "now also add a load balancer in front of the scaled service I just suggested."

**Why this priority**: Without pending state awareness, the AI can't build on its own suggestions across turns, which makes multi-turn collaboration awkward.

**Independent Test**: AI suggests adding a cache. Without approving, ask "now also add a read replica for the database." The AI's new suggestions build on the pending cache — the read replica connects to the already-proposed cache, not duplicating it. The prompt includes all three architecture views.

**Acceptance Scenarios**:

1. **Given** pending suggestions exist, **When** the AI constructs its prompt, **Then** it includes: current architecture (committed), proposed changes (pending), and architecture after approval (merged view)
2. **Given** the AI previously suggested adding a cache, **When** the user asks a follow-up, **Then** the AI's new suggestions reference the pending cache as if it exists
3. **Given** the AI suggests deleting an edge it previously suggested adding, **When** the suggestion is processed, **Then** the pending add is simply removed (flattened, no double-pending)
4. **Given** the AI suggests adding a node identical to one pending deletion, **When** the suggestion is processed, **Then** the pending deletion is cancelled (undeleted)

---

### User Story 4 - Suggestion Flattening (Priority: P2)

As the AI makes suggestions across multiple turns, contradictory or redundant operations are automatically flattened. If the AI deletes a suggested (not yet approved) edge, the edge is simply removed from the suggestion list. If the AI adds a node that matches a pending-delete node, the deletion is cancelled. This keeps the pending state clean and understandable.

**Why this priority**: Without flattening, the pending state becomes a confusing list of operations that may contradict each other.

**Independent Test**: AI suggests adding node X. In the next turn, AI suggests deleting node X. Result: no pending changes (the add and delete cancel out). The diagram shows no visual indicators.

**Acceptance Scenarios**:

1. **Given** a pending-add node, **When** the AI suggests deleting that same node, **Then** the pending add is removed (no net change)
2. **Given** a pending-delete node, **When** the AI suggests adding a node with the same type and name, **Then** the pending delete is cancelled
3. **Given** a pending-modify edge, **When** the AI suggests a different modification to the same edge, **Then** the newer modification replaces the older one
4. **Given** a pending-add edge, **When** the AI suggests modifying that pending-add edge, **Then** the modification is applied to the pending-add directly (not as a separate operation)

---

### Edge Cases

- What happens if the AI suggests deleting a node that has committed edges? The committed edges are also marked for pending deletion (cascade).
- What happens if the AI calls `modify_node` with a type change? The backend rejects it and returns an error to the AI. The system prompt instructs the AI not to do this.
- What happens if the user manually deletes a node that has pending suggestions referencing it? The pending suggestions referencing that node are cleaned up.
- What happens if the user manually adds an edge while pending suggestions exist? The manual change is committed immediately and coexists with pending suggestions.
- What happens if the AI suggests an edge between nodes that don't exist (neither committed nor pending)? The suggestion is rejected with an error message.
- What happens when the user refreshes the page? Pending suggestions are cleared (session-only per ADR-005).
- What about node positioning for AI-added nodes? The AI provides a suggested position, or the system auto-positions new nodes near related existing nodes.
- What happens if the AI tries to add an edge that duplicates an existing (source, target, protocol, direction) combination? The tool returns an error. The AI can then use `modify_edge` on the existing edge instead.
- What happens if the AI tries to modify an edge's protocol/direction to values that would create a duplicate? The tool returns an error explaining the conflict.
- What happens if the user tries to change an edge's protocol via the context menu to create a duplicate? The change is visually blocked (validation error) and not applied.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The AI MUST have access to 6 tools: `add_node`, `delete_node`, `modify_node`, `add_edge`, `delete_edge`, `modify_edge`
- **FR-002**: Tool calls MUST create pending suggestions, not immediate changes to the diagram
- **FR-003**: `modify_node` MUST only allow changes to name and replicaCount (not type)
- **FR-004**: `modify_edge` MUST only allow changes to protocol, direction, and syncAsync (not source/target)
- **FR-005**: Pending-add nodes and edges MUST display with a green glow visual treatment
- **FR-006**: Pending-delete nodes MUST display with a red glow and strikethrough on the name
- **FR-007**: Pending-delete edges with a protocol label MUST display with red color and strikethrough on the label
- **FR-008**: Pending-delete edges without a protocol label MUST display with red color and an × marker
- **FR-009**: Pending-modify nodes and edges MUST display changed fields as "old → new" (e.g., "HTTP → gRPC", "×1 → ×3")
- **FR-010**: Coincident add/delete edges between the same nodes MUST be visually offset so both are visible
- **FR-011**: An "Approve All" button MUST commit all pending suggestions to the diagram
- **FR-012**: A "Discard All" button MUST remove all pending suggestions and revert to the committed state
- **FR-013**: Approve/Discard buttons MUST only be visible when pending suggestions exist
- **FR-014**: Pending suggestions MUST accumulate across multiple chat turns
- **FR-015**: Contradictory suggestions MUST be flattened for same-identity operations only: deleting a pending-add removes it, adding the same identity as a pending-delete cancels the deletion, newer modifications to the same item replace older ones. Flattening MUST NOT auto-infer modify from delete+add sequences with different properties — the AI should use `modify_node`/`modify_edge` explicitly for property changes.
- **FR-016**: The AI prompt MUST include three sections: current architecture (committed), proposed changes (pending), and architecture after approval
- **FR-017**: The system prompt MUST instruct the AI to: (a) use tools directly when asked to modify the architecture (not describe and ask permission), (b) prefer `modify_node`/`modify_edge` when changing properties of existing items rather than delete+add sequences, (c) use delete+add only when changing a node's type or an edge's source/target (structural changes that modify tools cannot handle)
- **FR-018**: Deleting a committed node via tool MUST also mark its committed edges for pending deletion (cascade)
- **FR-019**: The AI MUST be able to provide a suggested position for new nodes, or the system MUST auto-position near related nodes
- **FR-020**: Node names MUST be unique across the entire diagram (committed + pending). When creating a node (user drag or AI tool), if the default name already exists, a suffix MUST be appended (e.g., "Service (2)", "Service (3)")
- **FR-021**: Renaming a node to a name that already exists MUST be visually blocked (validation error shown) and the rename MUST NOT be applied
- **FR-022**: AI tool calls MUST reference nodes by name (not internal ID). Edges are identified by the combination of source name, target name, protocol, and direction — since multiple edges between the same nodes are allowed (e.g., HTTP and TCP from the same service to the same database).
- **FR-023**: Edges MUST be unique by the combination of (source, target, protocol, direction) across committed + pending state. Creating a duplicate edge (user or AI) MUST be blocked.
- **FR-024**: Modifying an edge's protocol or direction in a way that would create a duplicate of an existing edge MUST be blocked — visually for user edits (validation error shown) and with an error response for AI tool calls so the AI can adjust its approach.
- **FR-025**: These uniqueness constraints apply to the combined committed + pending state. All edges (committed, pending-add, and pending-delete) count as existing for duplicate checking. Adding an edge that matches a pending-delete edge cancels the deletion (per FR-015 flattening) rather than creating a duplicate.

### Key Entities

- **PendingSuggestion**: A proposed change to the diagram. Can be an add, delete, or modify operation targeting a node or edge. Has a status (pending, approved, discarded) and a visual treatment.
- **SuggestionSet**: The accumulated collection of pending suggestions across chat turns. Flattened to remove contradictions. Cleared on approve, discard, or page refresh.
- **Tool Call**: An AI-invoked operation (add_node, delete_node, modify_node, add_edge, delete_edge, modify_edge) that produces a PendingSuggestion.
- **Three-View Prompt**: The prompt format showing committed state, pending changes, and merged state for AI context.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The AI successfully creates visual suggestions on the diagram when asked to modify the architecture (e.g., "add a cache") within 5 seconds
- **SC-002**: Users can distinguish between committed, pending-add, pending-delete, and pending-modify elements at a glance without clicking
- **SC-003**: Approving or discarding all suggestions takes a single click and updates the diagram within 1 second
- **SC-004**: The AI builds on its own pending suggestions in follow-up turns (multi-turn collaboration works)
- **SC-005**: Contradictory suggestions across turns are automatically resolved without user intervention

## Clarifications

### Session 2026-04-09

- Q: How should the AI reference nodes/edges in tool calls? → A: Nodes by name (unique, enforced by FR-020/FR-021). Edges by source name + target name + protocol + direction (since multiple edges between the same nodes are allowed). No internal IDs exposed to the AI.

## Assumptions

- The AI uses function calling (tool use) to invoke diagram operations — this is a natural fit for the Claude API's tool_use feature
- Node positioning for AI-added nodes defaults to auto-placement near the nodes they connect to. Exact positioning logic is implementation-defined.
- The system prompt explicitly instructs the AI to use tools rather than describe what it would do
- Pending state is session-only (per ADR-005) — cleared on page refresh
- All-or-nothing approve/discard for this milestone. Per-suggestion approve is future work.
- Undo/redo after approve is future work
- The AI's tool calls are interleaved with its text response — the AI explains what it's doing while calling tools
