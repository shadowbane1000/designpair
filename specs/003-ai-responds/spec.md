# Feature Specification: AI Responds

**Feature Branch**: `003-ai-responds`
**Created**: 2026-04-09
**Status**: Draft
**Input**: User description: "milestone 3"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ask the AI About My Architecture (Priority: P1)

A user has built a diagram with several connected components. They click an "Ask AI" button and the AI analyzes their architecture in real time. The response streams into a chat panel word by word, providing architectural feedback — identifying patterns, flagging risks, and suggesting improvements. The AI reasons about the topology (what connects to what, data flow direction, missing components) rather than just listing what's on the canvas.

**Why this priority**: This is the core value proposition of DesignPair. Everything built so far (canvas, palette, edges, serialization) exists to support this moment — the AI engaging with what the user has drawn.

**Independent Test**: Build a simple diagram (e.g., Load Balancer → Service → Database). Click "Ask AI". A streaming response appears in the chat panel, referencing specific components and connections from the diagram. The response demonstrates architectural understanding, not just a list of nodes.

**Acceptance Scenarios**:

1. **Given** a diagram with nodes and edges, **When** the user clicks "Ask AI", **Then** the AI response begins streaming into the chat panel within 3 seconds
2. **Given** the AI is responding, **When** text streams in, **Then** it appears word by word (not all at once) in the chat panel
3. **Given** a diagram with architectural issues (e.g., single point of failure), **When** the user asks the AI, **Then** the response identifies the issue by referencing specific components
4. **Given** an empty canvas, **When** the user clicks "Ask AI", **Then** the AI responds appropriately (e.g., suggesting where to start)

---

### User Story 2 - Real-Time Communication Between Frontend and Backend (Priority: P1)

The frontend and backend communicate via a persistent connection. When the user triggers an AI analysis, the current graph state is sent to the backend, which forwards it to the AI and streams the response back. The connection is resilient — if it drops, the user sees a clear status indicator and can reconnect.

**Why this priority**: Equal priority with the AI response — the communication channel is the prerequisite for delivering AI responses to the user.

**Independent Test**: Start the application. Verify the connection status indicator shows "connected". Click "Ask AI" — the graph state is sent and a response streams back. Kill the backend — the indicator shows "disconnected". Restart the backend — the connection recovers.

**Acceptance Scenarios**:

1. **Given** the application is running, **When** the frontend loads, **Then** a persistent connection to the backend is established and a status indicator shows "connected"
2. **Given** a connected session, **When** the user triggers "Ask AI", **Then** the current graph state JSON is sent to the backend
3. **Given** the backend receives graph state, **When** it processes the request, **Then** it streams the AI response back to the frontend chunk by chunk
4. **Given** the backend is stopped, **When** the connection drops, **Then** the status indicator shows "disconnected" and the "Ask AI" button is disabled
5. **Given** a disconnected state, **When** the backend becomes available again, **Then** the connection automatically recovers within 10 seconds

---

### User Story 3 - View the AI Chat Panel (Priority: P2)

A chat panel is visible alongside the canvas showing AI responses. Each response is displayed as a message in a conversation-style layout. The panel scrolls to show new content as it streams in.

**Why this priority**: The chat panel is the display surface for the AI response. It's simpler than the communication and AI logic, but required to see the output.

**Independent Test**: Click "Ask AI" with a diagram on the canvas. The chat panel shows the streaming response with a clear visual distinction between user actions and AI messages. The panel auto-scrolls as new content arrives.

**Acceptance Scenarios**:

1. **Given** the user triggers "Ask AI", **When** the response streams in, **Then** it appears as a new message in the chat panel
2. **Given** a long AI response, **When** it exceeds the visible area, **Then** the chat panel auto-scrolls to show the latest content
3. **Given** the AI is currently streaming, **When** the user views the chat panel, **Then** they see a visual indicator that the AI is still responding
4. **Given** multiple "Ask AI" requests, **When** the user views the chat panel, **Then** each response appears as a separate message in chronological order

---

### Edge Cases

- What happens if the user clicks "Ask AI" while a response is still streaming? The "Ask AI" button is disabled while the AI is responding. The user must wait for the current response to complete.
- What happens if the AI response is very long? The chat panel should handle responses of any length with scrolling.
- What happens if the backend is unreachable when "Ask AI" is clicked? The button should be disabled when disconnected; if clicked during a brief disconnect, show an error message.
- What happens if the AI API returns an error? Display a user-friendly error message in the chat panel (not a raw error).
- What happens if the graph state changes while the AI is responding? The current response continues with the graph state that was sent; the next request will use the updated state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The application MUST provide a persistent bidirectional connection between frontend and backend
- **FR-002**: The application MUST display a connection status indicator (connected/disconnected)
- **FR-003**: The connection MUST automatically reconnect when the backend becomes available after a disconnect
- **FR-004**: The application MUST provide an "Ask AI" button that sends the current graph state to the backend for analysis
- **FR-005**: The "Ask AI" button MUST be disabled when the connection is disconnected
- **FR-006**: The backend MUST construct a structured prompt from the graph state that enables the AI to reason about architectural topology, not just list components
- **FR-007**: The prompt MUST include topology analysis (connections, data flow direction, fan-out/fan-in, component roles)
- **FR-008**: The backend MUST stream the AI response back to the frontend as it is generated (not wait for completion)
- **FR-009**: The frontend MUST display a chat panel on the right side of the canvas showing AI responses in a conversation-style layout
- **FR-010**: The chat panel MUST auto-scroll to show new content as it streams in
- **FR-011**: The chat panel MUST visually distinguish between user-initiated actions and AI responses
- **FR-012**: The application MUST display a streaming indicator while the AI is generating a response
- **FR-013**: The application MUST display user-friendly error messages in the chat panel when the AI API returns an error
- **FR-014**: The "Ask AI" button MUST be disabled while the AI is actively streaming a response

### Key Entities

- **WebSocket Connection**: A persistent bidirectional channel between the frontend and backend. Has a status (connected, disconnected, reconnecting).
- **Graph-to-Prompt**: The transformation of the graph state JSON into a structured prompt the AI can reason about. Includes topology analysis, component roles, and connection patterns.
- **AI Message**: A response from the AI displayed in the chat panel. Streams in incrementally. Has a timestamp and a streaming/complete status.
- **Chat History**: An ordered list of AI messages within the current session. Not persisted across page reloads (per ADR-005).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The first AI response token appears in the chat panel within 3 seconds of clicking "Ask AI"
- **SC-002**: The AI response references specific components and connections from the user's diagram (not generic advice)
- **SC-003**: The connection recovers automatically within 10 seconds after the backend becomes available again
- **SC-004**: The system handles diagrams with 10+ nodes and 15+ edges without degradation in response quality or latency
- **SC-005**: Error states (disconnected, API error) are communicated to the user within 2 seconds

## Clarifications

### Session 2026-04-09

- Q: What happens if the user clicks "Ask AI" while a response is still streaming? → A: Disable the "Ask AI" button while streaming; user waits for the current response to complete
- Q: Where should the chat panel be placed relative to the canvas? → A: Right side panel (vertical split), same area as the debug panel

## Assumptions

- The AI analysis is triggered on demand (user clicks "Ask AI"), not automatically on every graph change
- The Anthropic API key is configured on the backend via environment variable (not exposed to the frontend)
- Chat history is session-only (per ADR-005: no persistence in v1)
- The AI uses a system prompt that establishes the "collaborative architect" tone per constitution principle I (Collaborator, Not Judge)
- The graph-to-prompt construction goes beyond naive JSON serialization per constitution principle IV (The Prompt Is the Product)
- One AI request at a time — concurrent requests are not supported in this milestone
- The chat panel does not support user freeform text input in this milestone (that's Milestone 4)
- The backend serves as a proxy to the Anthropic API — no caching or transformation of AI responses beyond streaming relay
