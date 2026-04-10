# Feature Specification: AI Proactivity

**Feature Branch**: `009-ai-proactivity`
**Created**: 2026-04-09
**Status**: Draft
**Input**: User description: "milestone 8"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Auto-Analyze Toggle (Priority: P1)

A user wants the AI to automatically comment on meaningful changes to their architecture without having to manually ask. They click a toggle in the chat panel header to enable "auto-analyze" mode (off by default). When enabled, the AI observes structural changes to the diagram and proactively provides architectural feedback. The user can turn it off at any time to return to on-demand analysis only.

**Why this priority**: The toggle is the gating mechanism for all auto-analyze behavior. Without it, no proactive analysis can happen, and the user has no control over the feature.

**Independent Test**: Open the app. Verify auto-analyze is off by default. Click the toggle to enable it. Add a database node to the diagram. The AI automatically provides feedback about the new component without the user typing anything. Toggle off. Add another component. The AI does not respond.

**Acceptance Scenarios**:

1. **Given** a fresh session, **When** the user views the chat panel, **Then** the auto-analyze toggle is visible and in the "off" position
2. **Given** auto-analyze is off, **When** the user adds a node, **Then** no automatic AI analysis is triggered
3. **Given** auto-analyze is on, **When** the user adds a database node and connects it, **Then** the AI proactively notes the new component and its connections within a few seconds
4. **Given** auto-analyze is on, **When** the user toggles it off, **Then** subsequent changes do not trigger automatic analysis

---

### User Story 2 - Debounced Structural Change Detection (Priority: P1)

When auto-analyze is enabled, the system detects only meaningful structural changes (adding/removing nodes, adding/removing edges, changing edge protocols) and ignores cosmetic changes (dragging nodes to reposition them, zooming, panning). Changes are debounced so that a burst of related operations (e.g., adding a node then immediately connecting it) is treated as a single trigger rather than multiple triggers. This prevents excessive AI calls and ensures the AI sees the complete change context.

**Why this priority**: Without proper debouncing and structural filtering, the feature would either overwhelm the user with constant AI responses or waste API calls on meaningless changes. This is essential for usability.

**Independent Test**: Enable auto-analyze. Add a service node, then drag it around the canvas for 5 seconds. The AI should respond once (for the node addition) but not for any of the drag events. Then add an edge from the service to an existing database. The AI responds again once the debounce settles.

**Acceptance Scenarios**:

1. **Given** auto-analyze is on, **When** the user drags an existing node to a new position, **Then** no automatic analysis is triggered
2. **Given** auto-analyze is on, **When** the user adds a node and then immediately adds an edge from it, **Then** only one analysis is triggered (after both changes settle)
3. **Given** auto-analyze is on, **When** the user zooms or pans the canvas, **Then** no automatic analysis is triggered
4. **Given** auto-analyze is on and the AI is currently streaming a response, **When** the user makes another structural change, **Then** the new change is queued and triggers analysis after the current response completes

---

### User Story 3 - Delta-Based Analysis (Priority: P2)

When auto-analyze triggers, the AI receives context about what changed since its last analysis rather than re-analyzing the entire graph from scratch. The delta includes which nodes were added or removed, which edges were added or removed, and which properties changed. This produces more relevant, focused feedback ("I see you added a Redis cache between the API and the database -- that addresses the read latency concern we discussed") rather than repeating analysis of unchanged parts.

**Why this priority**: Delta awareness makes the AI's proactive responses feel natural and conversational rather than repetitive. Without it, each auto-analysis would read like a fresh review, which quickly becomes annoying.

**Independent Test**: Enable auto-analyze. Add a service and database with an edge. Let the AI respond. Then add a cache node and connect it. The AI's second response specifically references the cache addition and its relationship to the existing architecture, not a full re-review.

**Acceptance Scenarios**:

1. **Given** auto-analyze is on and the AI has previously analyzed the graph, **When** a new node is added, **Then** the AI's response focuses on the delta (the new node and its connections) rather than re-analyzing the entire architecture
2. **Given** auto-analyze is on, **When** a node is removed, **Then** the AI's response references the removal and its implications for the remaining architecture
3. **Given** auto-analyze is on and the AI has never analyzed the graph, **When** the first structural change occurs, **Then** the AI analyzes the full architecture (no delta available yet)
4. **Given** auto-analyze is on, **When** an edge protocol is changed, **Then** the AI's delta analysis references the protocol change specifically

---

### Edge Cases

- What happens if the user enables auto-analyze on an empty canvas? No analysis triggers until a structural change occurs (adding a node).
- What happens if auto-analyze triggers while a previous AI response is still streaming? The new change is queued; analysis starts after the current stream completes.
- What happens if the user manually sends a chat message while auto-analyze is pending? The manual message takes priority and resets the debounce timer. The user's explicit question supersedes the auto-analysis.
- What happens if the user approves/discards suggestions while auto-analyze is on? Approve/discard are structural changes and trigger auto-analysis of the resulting state.
- What happens if the user toggles auto-analyze off while a debounced trigger is pending? The pending trigger is cancelled.
- What happens if the user makes many rapid changes? All changes within the debounce window are batched; only one analysis fires after the debounce settles.
- What happens if auto-analyze is on and the turn limit is reached? Auto-analyze stops triggering, same as manual chat. The turn limit message is shown.
- What happens if auto-analyze is on and the rate limiter blocks the request? The rate-limited response is shown, and the next auto-analyze waits for the retry period.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The chat panel MUST include a toggle for auto-analyze mode, defaulting to off
- **FR-002**: When auto-analyze is on, structural changes (add/remove nodes, add/remove edges, change edge protocol/direction/syncAsync) MUST trigger an automatic AI analysis
- **FR-003**: Cosmetic changes (node position, zoom, pan) MUST NOT trigger auto-analysis
- **FR-004**: Structural changes MUST be debounced with a configurable delay so rapid changes produce a single analysis trigger
- **FR-005**: If the AI is currently streaming when a new trigger occurs, the new trigger MUST be queued and fire after the stream completes
- **FR-006**: The auto-analysis prompt MUST include a delta describing what changed since the last analysis
- **FR-007**: The delta MUST include: nodes added, nodes removed, edges added, edges removed, and properties changed
- **FR-008**: When no prior analysis exists, the first auto-analysis MUST analyze the full architecture
- **FR-009**: Manual chat messages MUST take priority over pending auto-analysis triggers (cancel the pending auto-trigger)
- **FR-010**: Toggling auto-analyze off MUST cancel any pending debounced trigger
- **FR-011**: Auto-analysis messages MUST appear in the chat panel as AI messages with an "(auto-analysis)" label prefix in the role header to distinguish them from user-initiated responses
- **FR-012**: Auto-analyze MUST respect the existing turn limit and rate limiting
- **FR-013**: Approve/discard of pending suggestions MUST be considered structural changes for auto-analyze purposes
- **FR-014**: The auto-analyze toggle state MUST persist for the duration of the session (not across page refreshes per ADR-005)
- **FR-015**: Node renaming and replica count changes MUST be considered structural changes for auto-analyze purposes

### Key Entities

- **AutoAnalyzeState**: Tracks whether auto-analyze is enabled, the last-analyzed graph snapshot (for delta computation), and any pending debounce timer
- **GraphDelta**: The difference between the current graph state and the last-analyzed snapshot. Contains added nodes, removed nodes, added edges, removed edges, and modified properties.
- **AutoAnalyzeTrigger**: A debounced event that fires when structural changes settle. Carries the current graph state and the computed delta.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Auto-analyze triggers within 3 seconds of the last structural change settling (debounce + send)
- **SC-002**: Cosmetic-only operations (drag, zoom, pan) produce zero auto-analyze triggers
- **SC-003**: A burst of 5 structural changes within 1 second produces exactly 1 auto-analyze trigger
- **SC-004**: The AI's auto-analysis response references the specific changes made (delta-aware), not a full re-review of unchanged components
- **SC-005**: Users can enable/disable auto-analyze with a single click and the change takes effect immediately

## Clarifications

### Session 2026-04-09

- Q: How should auto-analyze messages be visually distinguished from user-initiated analysis? → A: Auto-analyze messages display with a subtle "(auto-analysis)" label prefix in the AI role header, using the same styling as regular AI messages. No separate color or icon -- keep it simple.
- Q: Should auto-analyze be disabled while pending suggestions exist (to avoid confusing AI responses about a diagram in flux)? → A: No, auto-analyze should work normally even with pending suggestions. The AI already has pending-state context from M7. The auto-analysis prompt includes pending state so the AI can comment on both committed and suggested changes.
- Q: What should the debounce delay be, and should node/edge property changes (like renaming a node) count as structural? → A: 2-second debounce. Renaming a node counts as structural (it changes the architecture semantics). Replica count changes also count as structural. Only pure position/layout changes are excluded.

## Assumptions

- Auto-analyze uses the same WebSocket connection and AI backend as manual chat — no separate endpoint needed
- The debounce delay is ~2 seconds, tunable but not user-configurable in this milestone
- Auto-analyze messages count toward the existing turn limit (same conversation)
- The delta is computed client-side by comparing the current graph state to a stored snapshot of the last-analyzed state
- Auto-analyze does not trigger tool_use (suggestions) — it provides observational feedback only, same as a manual "analyze my architecture" request
- The auto-analyze toggle is session-only (consistent with ADR-005 no-persistence policy)
