# Feature Specification: Component Annotations

**Feature Branch**: `012-component-annotations`
**Created**: 2026-04-10
**Status**: Draft
**Input**: User description: "Click a node to open annotation panel. Free-text notes per component included in AI prompt. Annotations serialized in graph state for export/import."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Add Annotation to Component (Priority: P1)

A user clicks on a node in the canvas to select it. An annotation panel appears (inline popover near the node) with a text area. The user types a note like "Handles 10K RPS" and the note is saved to the node.

**Why this priority**: Core interaction — without this, the feature doesn't exist.

**Independent Test**: Click a service node, type an annotation, click away, click back — annotation persists.

**Acceptance Scenarios**:

1. **Given** a diagram with a Service node, **When** the user clicks the node, **Then** an annotation panel appears with a text input area.
2. **Given** the annotation panel is open, **When** the user types "Handles auth for all services", **Then** the annotation is saved to the node data.
3. **Given** a node has an annotation, **When** the user clicks the node again, **Then** the existing annotation is displayed and editable.
4. **Given** the annotation panel is open, **When** the user clicks elsewhere on the canvas, **Then** the panel closes.

---

### User Story 2 - AI References Annotations (Priority: P2)

When the user asks the AI to analyze the architecture, annotations are included in the prompt. The AI references them in its feedback (e.g., "You mentioned the API handles authentication — consider what happens if it goes down").

**Why this priority**: The primary value of annotations is enriching the AI's context.

**Independent Test**: Add an annotation to a node, ask the AI to review, verify the AI mentions the annotation content.

**Acceptance Scenarios**:

1. **Given** a node with annotation "Handles 10K RPS", **When** the user asks the AI for analysis, **Then** the prompt includes the annotation text, and the AI can reference it.
2. **Given** no nodes have annotations, **When** the user asks for analysis, **Then** the prompt is unchanged from current behavior.

---

### User Story 3 - Annotations in Export/Import (Priority: P3)

Annotations are included when the diagram is serialized (for WebSocket messages and any future export/import). Importing a diagram with annotations preserves them.

**Why this priority**: Ensures annotations persist across sessions and are not lost.

**Independent Test**: Add annotations, check that the serialized graph state includes them.

**Acceptance Scenarios**:

1. **Given** a node with annotation "Primary DB — handles writes only", **When** the graph is serialized, **Then** the annotation field is present in the JSON output.
2. **Given** a serialized graph with annotation data, **When** loaded, **Then** annotations are restored and visible.

---

### Edge Cases

- What happens when an annotation is empty string? Treated as no annotation (not serialized).
- What happens when a node is deleted while its annotation panel is open? Panel closes.
- What happens with very long annotations? Text area scrolls; no character limit enforced in UI (backend can truncate for prompt if needed).
- What happens during pending suggestions? Annotation panel should not open for pending nodes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to click a node to open an annotation panel.
- **FR-002**: The annotation panel MUST display a text area for free-text notes.
- **FR-003**: Annotations MUST be saved to the node data and persist within the session.
- **FR-004**: Annotations MUST be included in the serialized graph state sent to the backend.
- **FR-005**: The backend MUST include annotations in the prompt sent to the AI.
- **FR-006**: Each annotation MUST appear next to its component name in the prompt (e.g., "**API Gateway** (apiGateway): Handles 10K RPS").
- **FR-007**: The annotation panel MUST close when clicking outside it or on a different node.
- **FR-008**: Nodes with annotations MUST have a visual indicator (small icon or badge) when the panel is closed.

### Key Entities

- **Annotation**: Free-text string associated with a graph node. Optional (empty = no annotation). Stored as part of node data.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can add, edit, and view annotations on any node type.
- **SC-002**: AI feedback references annotation content when relevant to its analysis.
- **SC-003**: Annotations survive serialization round-trips (serialize -> deserialize -> compare).
- **SC-004**: No annotations visible means no change to existing prompt or behavior.

## Clarifications

### Session 2026-04-10

No critical ambiguities. Autonomous decisions:
- Annotation UI: inline popover (not side drawer) — keeps user close to the node they're annotating
- No character limit in the UI
- Visual indicator for annotated nodes: small icon badge on the node

## Assumptions

- Annotations are plain text only (no markdown, no rich text).
- No persistence beyond the browser session (consistent with ADR-005).
- The annotation panel is a simple popover, not a full-featured editor.
- The backend does not validate annotation content beyond including it in the prompt.
