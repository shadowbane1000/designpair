# Feature Specification: Drag and Connect

**Feature Branch**: `002-drag-and-connect`
**Created**: 2026-04-08
**Status**: Draft
**Input**: User description: "milestone 2"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Drag Components onto the Canvas (Priority: P1)

A user sees a palette of architecture components alongside the canvas. They drag a component (e.g., "Service" or "Database") from the palette onto the canvas, where it appears as a styled node with its type label and a user-editable name. They can drag multiple components to build up a system diagram.

**Why this priority**: Without components on the canvas, there is nothing to connect or serialize. This is the foundational interaction for the entire product.

**Independent Test**: Open the application. Drag a Service node from the palette onto the canvas. It appears where dropped, displays its type and a default name. Drag additional components of different types. All appear correctly.

**Acceptance Scenarios**:

1. **Given** the canvas is displayed, **When** the user views the palette, **Then** they see 5 component types: Service, Database, Cache, Queue, Load Balancer
2. **Given** a component in the palette, **When** the user drags it onto the canvas, **Then** a new node of that type appears at the drop position
3. **Given** a node on the canvas, **When** the user views it, **Then** it displays a type label, a visual indicator of its category, and a default name
4. **Given** a node on the canvas, **When** the user double-clicks the name, **Then** they can edit it inline
5. **Given** multiple nodes on the canvas, **When** the user drags them, **Then** each node can be repositioned independently

---

### User Story 2 - Connect Components with Edges (Priority: P1)

A user connects two components by dragging from one node's connection handle to another. The edge appears as a visual link between the two components. Edges can optionally be labeled to describe the connection type (e.g., "HTTP", "async").

**Why this priority**: Equal priority with drag — connections are what make a diagram meaningful. An architecture is defined by relationships, not just components.

**Independent Test**: Place two nodes on the canvas. Drag from one node's handle to another. An edge appears connecting them. Click the edge to add a label.

**Acceptance Scenarios**:

1. **Given** two nodes on the canvas, **When** the user drags from one node's connection handle to another node, **Then** a directed edge appears connecting them
2. **Given** a connected edge, **When** the user views it, **Then** the edge displays as a directed arrow showing data flow direction
3. **Given** a connected edge, **When** the user clicks or double-clicks it, **Then** they can add or edit a text label on the edge
4. **Given** multiple nodes, **When** the user creates several connections, **Then** all edges render without overlapping their labels
5. **Given** a connected edge, **When** the user selects and deletes it, **Then** the edge is removed and the nodes remain

---

### User Story 3 - Inspect Graph State as JSON (Priority: P2)

A user wants to verify the current state of their diagram in a structured format. They can access a JSON representation of the graph (nodes and edges with their types, names, labels, and positions) through an in-app debug panel embedded in the application UI. The JSON MUST be visible without requiring browser developer tools (F12 console).

**Why this priority**: JSON serialization is critical infrastructure for the AI integration in Milestone 3 and for AI-assisted debugging of the application itself. An in-app panel ensures the graph state is accessible to both human users and AI tools that interact with the browser.

**Independent Test**: Build a diagram with several connected nodes. Open the in-app debug panel. The JSON output accurately reflects all nodes (type, name, position) and edges (source, target, label).

**Acceptance Scenarios**:

1. **Given** a diagram with nodes and edges, **When** the user opens the in-app debug panel, **Then** they see a JSON representation of the complete graph without needing browser developer tools
2. **Given** the JSON output, **When** the user inspects it, **Then** each node includes its type, name, and position
3. **Given** the JSON output, **When** the user inspects it, **Then** each edge includes its source node, target node, and label (if set)
4. **Given** the user adds or removes components, **When** they view the graph state again, **Then** the JSON reflects the current state immediately

---

### Edge Cases

- What happens when the user drags a component outside the visible canvas area? The node should still be placed; the canvas can be panned to find it.
- What happens when the user tries to connect a node to itself? Self-connections should be prevented.
- What happens when the user creates duplicate edges between the same two nodes? Duplicate edges should be allowed (different labels represent different connections, e.g., HTTP and async).
- What happens with no nodes on the canvas? The palette is always visible; the JSON state shows empty arrays.
- What happens when the user deletes a node that has edges? Connected edges should be automatically removed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The application MUST display a component palette with 5 architecture component types: Service, Database, Cache, Queue, Load Balancer
- **FR-002**: Users MUST be able to drag components from the palette onto the canvas to create nodes
- **FR-003**: Each node MUST display its component type, a visual category indicator, and an editable name
- **FR-004**: Users MUST be able to create directed edges by dragging between node connection handles
- **FR-005**: Users MUST be able to add or edit text labels on edges
- **FR-006**: Users MUST be able to delete nodes and edges from the canvas
- **FR-007**: Deleting a node MUST automatically remove all edges connected to it
- **FR-008**: The application MUST prevent self-connections (edges from a node back to itself)
- **FR-009**: The application MUST serialize the complete graph state (nodes and edges with all metadata) to JSON
- **FR-010**: The JSON representation MUST update immediately when the graph changes
- **FR-011**: Users MUST be able to view the current graph state JSON through a collapsible in-app debug panel, hidden by default, toggled via a button or keyboard shortcut (browser developer tools MUST NOT be required)

### Key Entities

- **Node**: An architecture component placed on the canvas. Has a type (Service, Database, Cache, Queue, Load Balancer), an editable name, and a position on the canvas.
- **Edge**: A directed connection between two nodes. Has a source node, a target node, and an optional text label describing the connection type.
- **Graph State**: The complete collection of nodes and edges representing the current architecture diagram. Serializable to JSON.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can build a diagram with 10+ components and 15+ connections without any interaction lag
- **SC-002**: Dragging a component from palette to canvas completes in a single gesture (no multi-step process)
- **SC-003**: The JSON graph state accurately reflects 100% of nodes and edges currently on the canvas
- **SC-004**: All 5 component types are visually distinguishable from each other at a glance
- **SC-005**: A new user can place their first component within 10 seconds of opening the application (discoverability)

## Clarifications

### Session 2026-04-08

- Q: How should the debug panel be presented? → A: Collapsible side panel, hidden by default, toggled via button or keyboard shortcut

## Assumptions

- The component palette is always visible alongside the canvas (not hidden behind a menu or toggle)
- Node names default to the component type (e.g., "Service", "Database") and can be edited in place
- Edge labels are optional — edges without labels are valid connections
- The debug panel is a collapsible side panel, hidden by default, toggled via button or keyboard shortcut — it does not need polished UX but MUST be accessible without browser developer tools, to support AI-assisted debugging via browser automation tools
- Node positions are included in the JSON to support future save/restore, but the AI will reason about topology not positions (per constitution principle II)
- This milestone does not include undo/redo functionality
- This milestone does not include copy/paste of nodes
