# Feature Specification: Connections and Flow Refinement

**Feature Branch**: `006-connection-flow`
**Created**: 2026-04-09
**Status**: Draft
**Input**: User description: "milestone 6"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Connect Any Handle to Any Handle (Priority: P1)

A user drags a connection from any handle on one node to any handle on another node, regardless of which side or whether the handle was previously designated as "source" or "target." The arrow on the edge defines data flow direction based on which handle was dragged from (source) and which was dragged to (target). This allows natural diagramming — the user connects things where it makes visual sense, not where the tool forces them.

**Why this priority**: The current fixed source/target handle distinction (top/left = target, bottom/right = source) creates awkward diagonal arrows and confuses users who don't understand the hidden constraint. Removing it is the highest-impact UX improvement.

**Independent Test**: Drag from the top handle of Node A to the bottom handle of Node B. An arrow appears pointing from A to B. Drag from Node B's left handle to Node A's right handle. A second arrow appears pointing from B to A. Both connections are valid.

**Acceptance Scenarios**:

1. **Given** two nodes on the canvas, **When** the user drags from any handle on one node to any handle on another, **Then** a directed edge is created with the arrow pointing from source to target
2. **Given** a connection between two nodes, **When** the user views the edge, **Then** the arrow clearly indicates the direction of data flow
3. **Given** the existing self-connection prevention, **When** the user drags from a handle back to the same node, **Then** the connection is still prevented

---

### User Story 2 - Choose Edge Direction and Protocol (Priority: P1)

A user wants to specify the type of connection (HTTP, gRPC, async, pub/sub, SQL, TCP) and whether data flows one-way or both ways. When creating or editing an edge, they can select from predefined protocol labels and toggle between one-way and bidirectional arrows. The edge's visual appearance changes based on the protocol — synchronous connections appear as solid lines and asynchronous connections appear as dashed lines. Edge color reflects the protocol type.

**Why this priority**: Equal priority with unified handles — protocol-aware connections are what make architecture diagrams meaningful. "HTTP" vs "async" fundamentally changes the AI's analysis of consistency, latency, and failure modes.

**Independent Test**: Connect two nodes. Select "HTTP" as the protocol — the edge shows a solid line with the protocol label and a protocol-specific color. Switch to "async" — the line becomes dashed. Toggle to bidirectional — arrows appear on both ends. The debug panel JSON reflects all properties.

**Acceptance Scenarios**:

1. **Given** a connected edge, **When** the user clicks on it, **Then** they see options to select a protocol from a predefined list (HTTP, gRPC, SQL, TCP, async, pub/sub, WebSocket, MQTT) or enter custom text
2. **Given** a connected edge, **When** the user selects a protocol, **Then** the edge displays the protocol label, changes color to match the protocol, and shows solid (sync) or dashed (async) line style based on the protocol's default classification
3. **Given** a connected edge with a protocol selected, **When** the user views the sync/async toggle, **Then** it defaults to the protocol's natural classification but can be overridden (e.g., HTTP toggled to async for webhook patterns)
4. **Given** a connected edge, **When** the user toggles bidirectional mode, **Then** the edge displays arrows on both ends
5. **Given** a one-way edge, **When** the user reverses the direction, **Then** the arrow flips to point the opposite way (source and target swap)
6. **Given** the graph state JSON, **When** the user views it in the debug panel, **Then** each edge includes protocol, direction type (one-way or bidirectional), sync/async classification, and source/target

---

### User Story 3 - AI Analyzes Protocol and Flow Direction (Priority: P2)

The AI's architectural analysis incorporates protocol and direction information. It identifies synchronous call chains, async boundaries, bidirectional dependencies, and protocol mismatches. For example, it can flag "this synchronous HTTP chain is 4 hops deep — consider introducing an async boundary" or "this bidirectional dependency between Service A and Service B creates tight coupling."

**Why this priority**: The AI analysis value depends on understanding not just *what* is connected but *how*. Protocol awareness transforms generic feedback into actionable architectural advice.

**Independent Test**: Build a diagram with a mix of HTTP (sync) and async connections. Ask the AI. The response distinguishes between sync and async paths and provides protocol-aware analysis.

**Acceptance Scenarios**:

1. **Given** a diagram with sync and async connections, **When** the AI analyzes it, **Then** the response distinguishes between synchronous and asynchronous paths
2. **Given** a long synchronous chain (3+ hops), **When** the AI analyzes it, **Then** it flags the latency and failure cascade risk
3. **Given** a bidirectional edge, **When** the AI analyzes it, **Then** it identifies the tight coupling implication
4. **Given** edges with different protocols, **When** the AI analyzes it, **Then** the prompt includes protocol distribution and sync/async boundary analysis

---

### Edge Cases

- What happens to existing edges that have no protocol set? They default to a generic "unlabeled" style (solid gray line, no color coding). The AI treats them as unspecified connections.
- What happens when the user reverses a bidirectional edge? Reversing has no effect on bidirectional edges since both directions are already indicated.
- What if the user selects "custom" protocol text? The edge uses default sync styling (solid line) with a neutral color. The AI treats custom labels as informational text.
- What about edges created before this milestone? Existing edges continue to work as one-way with no protocol. They can be upgraded by clicking and selecting a protocol.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: All handles on a node MUST accept connections in either direction (no fixed source/target distinction on handles)
- **FR-002**: The arrow on the edge MUST indicate data flow direction based on which handle was dragged from (source) and which was dragged to (target)
- **FR-003**: Users MUST be able to select a protocol label from 8 predefined options: HTTP, gRPC, SQL, TCP (sync default), async, pub/sub, WebSocket, MQTT (async default)
- **FR-004**: Users MUST be able to enter custom protocol text as an alternative to predefined options
- **FR-005**: Protocols with sync classification MUST render as solid lines; protocols with async classification MUST render as dashed lines
- **FR-006**: Each protocol MUST default to its natural sync/async classification (sync: HTTP, gRPC, SQL, TCP; async: async, pub/sub, WebSocket, MQTT) but the user MUST be able to override this per edge
- **FR-007**: Each predefined protocol type MUST have a distinct color
- **FR-008**: Users MUST be able to toggle an edge between one-way and bidirectional
- **FR-009**: Bidirectional edges MUST display arrows on both ends
- **FR-010**: Users MUST be able to reverse the direction of a one-way edge
- **FR-011**: The graph serialization MUST include protocol, direction type, and sync/async classification for each edge
- **FR-012**: The AI prompt construction MUST include protocol-aware analysis: sync/async boundary detection, synchronous chain depth, protocol distribution, bidirectional dependency identification
- **FR-013**: Existing edges with no protocol MUST continue to function with default styling (solid gray, no color)

### Key Entities

- **Edge Protocol**: A connection type label from 8 predefined options (HTTP, gRPC, SQL, TCP, async, pub/sub, WebSocket, MQTT) or custom text. Determines default line style, color, and AI analysis classification.
- **Edge Direction**: One-way (default) or bidirectional. One-way edges have a single arrow; bidirectional edges have arrows on both ends.
- **Sync/Async Classification**: Defaults from protocol (sync: HTTP, gRPC, SQL, TCP; async: async, pub/sub, WebSocket, MQTT) but user-overridable per edge. Determines solid vs dashed line style. Custom/unlabeled defaults to sync.
- **Edge (updated)**: Now includes protocol, directionType, and syncAsync in addition to source, target, and label.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can connect any handle to any handle on different nodes in a single drag gesture
- **SC-002**: The protocol and direction of every edge is identifiable at a glance without clicking (via color, line style, and arrows)
- **SC-003**: The AI references sync/async boundaries and protocol types in its analysis when the diagram contains mixed connection types
- **SC-004**: Edge direction can be reversed in 2 or fewer interactions
- **SC-005**: All 8 predefined protocols are visually distinguishable by color

## Clarifications

### Session 2026-04-09

- Q: Should the user be able to override the sync/async classification for a protocol? → A: Yes. Protocol sets the default (e.g., HTTP defaults to sync) but user can override per edge (e.g., HTTP toggled to async for webhook/callback patterns).
- Q: Should WebSocket and MQTT be predefined protocols? → A: Yes. 8 predefined protocols: HTTP, gRPC, SQL, TCP (sync default), async, pub/sub, WebSocket, MQTT (async default). Plus custom text.

## Assumptions

- The existing freeform text label on edges is replaced by the protocol selector. Users who want custom text use the "custom" option.
- Protocol colors are predefined and not user-adjustable in this milestone (per the milestone description: "defined by protocol type")
- The edge context menu (for reverse, bidirectional toggle, protocol selection) appears on click or right-click on the edge
- Handle positions (top, bottom, left, right) remain the same visually — only the source/target restriction is removed
- Self-connections remain blocked regardless of handle configuration
- This milestone does not change how nodes are selected or deleted — only edge behavior changes
