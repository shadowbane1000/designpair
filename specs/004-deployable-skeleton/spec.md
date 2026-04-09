# Feature Specification: Deployable Skeleton

**Feature Branch**: `004-deployable-skeleton`
**Created**: 2026-04-09
**Status**: Draft
**Input**: User description: "milestone 4"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Have a Multi-Turn Conversation with the AI (Priority: P1)

A user has been building their architecture diagram and has already asked the AI for an initial analysis. Now they want to ask follow-up questions — "What if I added a cache here?" or "Can you explain the consistency implications in more detail?" The user types a freeform question in an input field at the bottom of the chat panel, and the AI responds with context from the ongoing conversation and the current diagram state.

**Why this priority**: Multi-turn conversation transforms DesignPair from a one-shot analysis tool into an actual pairing session. This is the core experience — an ongoing dialogue about the architecture.

**Independent Test**: Build a diagram. Click "Ask AI" for the initial analysis. Type a follow-up question in the input field. The AI responds with awareness of both the diagram and the previous conversation.

**Acceptance Scenarios**:

1. **Given** the chat panel with a previous AI response, **When** the user types a question in the input field and presses Enter, **Then** the AI responds with context from the conversation and the current diagram state
2. **Given** a multi-turn conversation, **When** the user views the chat panel, **Then** all messages (user questions and AI responses) appear in chronological order
3. **Given** the input field, **When** the user types a question, **Then** the current diagram state is included with the question (so the AI sees any changes since the last analysis)
4. **Given** a conversation in progress, **When** the AI is currently streaming a response, **Then** the input field is disabled until the response completes

---

### User Story 2 - Access the Application at a Public URL (Priority: P1)

A user (or interviewer reviewing the portfolio) navigates to `designpair.colberts.us` and sees the DesignPair application running. They can immediately start dragging components, connecting them, and asking the AI for analysis — no local setup required.

**Why this priority**: Equal priority with conversation — the application must be live and accessible to serve as a portfolio piece. Without deployment, the project only exists on a local machine.

**Independent Test**: Navigate to `https://designpair.colberts.us` in a browser. The application loads with the palette, canvas, and chat panel. Build a diagram and click "Ask AI" — the full flow works.

**Acceptance Scenarios**:

1. **Given** the URL `designpair.colberts.us`, **When** a user navigates to it, **Then** the application loads with HTTPS
2. **Given** the deployed application, **When** the user builds a diagram and clicks "Ask AI", **Then** the AI responds with streaming analysis (same as local)
3. **Given** the deployed application, **When** the user types follow-up questions, **Then** the multi-turn conversation works end-to-end
4. **Given** the deployed environment, **When** the application is updated via CI, **Then** the new version is deployed automatically

---

### User Story 3 - Conversation History Within a Session (Priority: P2)

A user has had a back-and-forth conversation with the AI about their architecture. The entire conversation history is visible in the chat panel — they can scroll up to review earlier questions and responses. The conversation persists as long as the browser tab is open but is not saved across page reloads (per ADR-005).

**Why this priority**: Session persistence enables a coherent conversation flow. Without it, previous context is lost on each interaction, reducing the pairing experience.

**Independent Test**: Have a multi-turn conversation (3+ exchanges). Scroll up in the chat panel — all messages are visible. Refresh the page — the conversation is cleared (expected behavior per ADR-005).

**Acceptance Scenarios**:

1. **Given** a conversation with 3+ exchanges, **When** the user scrolls up in the chat panel, **Then** all previous messages are visible
2. **Given** a conversation in progress, **When** the user refreshes the page, **Then** the conversation history is cleared and the canvas resets
3. **Given** the backend receives a follow-up question, **When** it constructs the AI prompt, **Then** previous conversation turns are included as context for the AI

---

### Edge Cases

- What happens when the conversation history becomes very long? The backend should manage context window limits by summarizing or truncating older messages.
- What happens when the user submits an empty question? An empty submission sends the default "Analyze my architecture" prompt, providing the same one-click analysis as before.
- What happens when the user submits a very long question? Accept up to a reasonable limit (e.g., 2000 characters) and show a character count indicator near the limit.
- What happens when the user changes the diagram between conversation turns? The current diagram state is sent with each question, so the AI always sees the latest version.
- What happens if the deployment server is unreachable? Standard nginx error pages serve; the application should recover when the server comes back.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The chat panel MUST include a text input field where users can type freeform questions
- **FR-002**: Users MUST be able to submit questions by pressing Enter or clicking a send button. The text input replaces the previous "Ask AI" button as the single interaction point.
- **FR-003**: Submitting a question MUST send the current diagram state along with the question text to the backend
- **FR-004**: The AI MUST respond with awareness of the full conversation history and the current diagram state
- **FR-005**: The backend MUST include conversation history when constructing the AI prompt
- **FR-006**: The input field MUST be disabled while the AI is streaming a response
- **FR-007**: Submitting an empty or whitespace-only input MUST substitute the default text "Analyze my architecture" on the frontend before sending — the backend receives the actual text, not an empty string. This keeps the default prompt in one place (the frontend).
- **FR-008**: The application MUST be deployed to `designpair.colberts.us` with HTTPS
- **FR-009**: The deployment MUST include both frontend and backend services running in containers
- **FR-010**: The CI pipeline MUST deploy updates automatically when changes are merged to main
- **FR-011**: The deployed application MUST function identically to the local development environment
- **FR-012**: Conversation history MUST persist within a browser session but MUST NOT persist across page reloads

### Key Entities

- **User Message**: A freeform text question typed by the user. Sent alongside the current graph state.
- **Conversation History**: An ordered list of user messages and AI responses within a session. Included in the AI prompt for context continuity.
- **Deployment**: The containerized application running at `designpair.colberts.us`, consisting of frontend (static files) and backend (Go server with WebSocket + LLM) behind nginx with TLS.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can have a 5+ turn conversation where each AI response shows awareness of previous context
- **SC-002**: Follow-up questions receive the first AI token within 3 seconds (same as initial analysis)
- **SC-003**: The application at `designpair.colberts.us` loads in under 5 seconds on a standard connection
- **SC-004**: The full workflow (draw → ask → follow up) works at the public URL with no difference from local
- **SC-005**: A CI merge to main results in the new version being live within 10 minutes

## Clarifications

### Session 2026-04-09

- Q: Should the freeform text input replace the "Ask AI" button or coexist with it? → A: Replace. The text input is the single interaction point. Submitting empty input sends a default "Analyze my architecture" prompt.

## Assumptions

- The Anthropic API key is stored as a server-side environment variable (`.env` file on the server, not in git)
- Conversation history is managed by the backend — the frontend sends all messages and the backend assembles the prompt
- The context window is managed by truncating the oldest messages when the total exceeds the model's limit, keeping the most recent turns plus the current graph state
- The frontend nginx container serves the static build; the backend container handles WebSocket and LLM
- The deployment target is the same Lightsail server used by ADR Insight (`tyler.colberts.us`)
- Docker Compose orchestrates both containers with nginx reverse proxy (same pattern as `designpair-adrs`)
- The subdomain `designpair.colberts.us` DNS and TLS certificate setup follows the same process as `designpair-adrs.colberts.us`
