# Feature Specification: AI Interface Abuse Hardening

**Feature Branch**: `008-ai-abuse-hardening`  
**Created**: 2026-04-09  
**Status**: Draft  
**Input**: User description: "Harden the AI interface against abuse. Publicly deployed with no access restrictions. Minimize costs via diagram size limits, diagram-required requests, topic-constrained system prompt, IP-based rate limiting (behind reverse proxy), and conversation turn limits."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Legitimate User Gets Helpful Feedback (Priority: P1)

A visitor draws an architecture diagram with a handful of components and asks the AI collaborator for feedback. The system accepts the request, the AI responds with architecture-relevant advice, and the conversation flows naturally within a reasonable number of exchanges.

**Why this priority**: This is the core happy path. All hardening measures must preserve this experience — abuse prevention that breaks the primary use case is worse than no prevention at all.

**Independent Test**: Can be fully tested by drawing a 5-node diagram, sending an architecture question, and verifying the AI responds with relevant feedback within expected time.

**Acceptance Scenarios**:

1. **Given** a user has a diagram with 10 nodes and 8 edges, **When** they ask "What are the single points of failure here?", **Then** the AI responds with architecture-relevant analysis of their specific diagram.
2. **Given** a user is in an active conversation with turns remaining, **When** they send a follow-up question about their diagram, **Then** the AI responds without requiring them to re-submit or re-draw anything.

---

### User Story 2 - Abusive Rapid-Fire Requests Are Throttled (Priority: P1)

A bad actor attempts to spam the AI endpoint with rapid requests — either automated scripts or manual rapid clicking. The system detects the excessive request rate and temporarily blocks further AI queries from that source, returning a clear message indicating they should slow down.

**Why this priority**: Rate limiting is the single highest-impact cost protection measure. Without it, a single actor can generate unbounded AI costs in minutes.

**Independent Test**: Can be tested by sending requests faster than the allowed rate from a single source and verifying that excess requests are rejected with an appropriate message.

**Acceptance Scenarios**:

1. **Given** a user has sent the maximum number of allowed requests within the rate window, **When** they send another request, **Then** the system rejects it with a message explaining the rate limit and when they can try again.
2. **Given** a rate-limited user waits for the cooldown period to pass, **When** they send a new request, **Then** the system accepts it normally.
3. **Given** the application is deployed behind a reverse proxy, **When** requests arrive, **Then** the system identifies the originating client IP correctly (not the proxy IP) for rate limiting purposes.

---

### User Story 3 - Oversized Diagram Is Rejected (Priority: P2)

A user (intentionally or accidentally) creates a diagram with more than 50 nodes and then tries to ask the AI for feedback. The system rejects the request before it reaches the AI, explaining that the diagram exceeds the maximum supported size and suggesting the user simplify their design.

**Why this priority**: Large diagrams generate large prompts, which directly increase per-request AI costs. A 50-node cap bounds the maximum token cost per request.

**Independent Test**: Can be tested by creating a diagram with 51 nodes, sending an AI request, and verifying it is rejected with a clear message before any AI processing occurs.

**Acceptance Scenarios**:

1. **Given** a user has a diagram with 51 nodes, **When** they send a message to the AI, **Then** the system rejects the request with a message stating the 50-node limit.
2. **Given** a user has a diagram with exactly 50 nodes, **When** they send a message to the AI, **Then** the system accepts the request normally.
3. **Given** a user's diagram is rejected for exceeding the node limit, **When** they remove nodes to bring the count to 50 or fewer, **Then** their next request is accepted.

---

### User Story 4 - Request Without a Diagram Is Rejected (Priority: P2)

A user opens the application and immediately tries to chat with the AI without drawing any diagram. The system rejects the request, explaining that a diagram is required for the AI to provide meaningful architecture feedback.

**Why this priority**: Requiring a diagram ensures every AI request has architectural context, preventing the AI from being used as a general-purpose chatbot (which would be both off-purpose and costly).

**Independent Test**: Can be tested by sending an AI message with an empty canvas (zero nodes) and verifying the request is rejected before any AI processing.

**Acceptance Scenarios**:

1. **Given** a user has an empty canvas with no nodes, **When** they send a message to the AI, **Then** the system rejects the request with a message explaining that a diagram is required.
2. **Given** a user previously had nodes but deleted all of them, **When** they send a message to the AI, **Then** the system rejects the request with the same diagram-required message.

---

### User Story 5 - Off-Topic Questions Are Deflected (Priority: P2)

A user has a diagram on the canvas but asks the AI something unrelated to architecture or their diagram — for example, "Write me a poem" or "What's the weather?" The AI declines the off-topic request and redirects the user to ask about their architecture.

**Why this priority**: Topic constraints prevent the AI from being used as a general assistant, reducing both abuse potential and wasted AI spend on non-architectural queries.

**Independent Test**: Can be tested by drawing a valid diagram, sending an off-topic question, and verifying the AI redirects the user to architecture-related topics.

**Acceptance Scenarios**:

1. **Given** a user has a valid diagram, **When** they ask "Write me a poem about cats", **Then** the AI declines and suggests they ask about their architecture instead.
2. **Given** a user has a valid diagram, **When** they ask a borderline question like "What programming language should I use for Service A?", **Then** the AI may answer briefly but steers the conversation back to architectural concerns.

---

### User Story 6 - Conversation Turn Limit Reached (Priority: P3)

A user has been chatting with the AI and reaches the maximum number of conversation turns. The system informs them that the conversation limit has been reached and suggests they start a new session (refresh the page) if they want to continue exploring.

**Why this priority**: Turn limits bound the total cost per session. This is a secondary defense — rate limiting and diagram requirements handle most abuse, but turn limits prevent long, drawn-out sessions from accumulating costs.

**Independent Test**: Can be tested by sending messages up to the turn limit and verifying the system rejects the next message with a clear explanation.

**Acceptance Scenarios**:

1. **Given** a user has used all their allowed conversation turns, **When** they send another message, **Then** the system responds with a message explaining the conversation limit and suggesting they start fresh.
2. **Given** a user is approaching the turn limit, **When** they send a message, **Then** the system includes a notice indicating how many turns remain.
3. **Given** a user has reached the turn limit, **When** they refresh the page and start a new session, **Then** they get a fresh set of conversation turns.

---

### Edge Cases

- What happens when a user adds nodes during a conversation, pushing past 50 mid-session? The node count is validated at each request, so the next AI request would be rejected with the size limit message.
- What happens when multiple browser tabs from the same IP are used simultaneously? Rate limiting applies per IP regardless of the number of tabs or sessions.
- What happens when the reverse proxy does not forward the client IP? The system should fail closed — if no client IP can be determined, requests should still be subject to a conservative global rate limit rather than bypassing rate limiting entirely.
- What happens when a user sends a message exactly at the turn limit boundary? The system should process the final allowed message and include the "limit reached" notice in the response.
- What happens if a user tries to manipulate the conversation turn count by modifying client-side state? Turn counting must be enforced server-side so that client manipulation has no effect.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST reject AI requests when the diagram contains more than 50 nodes, returning a user-friendly error message stating the limit.
- **FR-002**: System MUST reject AI requests when no diagram is present (zero nodes), returning a message explaining that a diagram is required.
- **FR-003**: System MUST enforce per-IP rate limiting on AI requests, determining the client IP by trusting only the rightmost IP from the reverse proxy forwarded header. When no forwarded header is present (local development, direct access), the system MUST fall back to the direct connection IP.
- **FR-004**: System MUST return a rate limit rejection message that tells the user when they can retry.
- **FR-005**: System MUST enforce a maximum number of conversation turns per session, where one turn is defined as one user message plus one AI response (a round-trip exchange). Messages beyond the limit are rejected with a clear explanation.
- **FR-006**: System MUST track conversation turns server-side so that client-side manipulation cannot bypass the limit.
- **FR-007**: System MUST notify users when they are approaching the conversation turn limit (e.g., "3 turns remaining").
- **FR-008**: The AI system prompt MUST constrain responses to topics related to the user's architecture diagram — software architecture, system design, infrastructure patterns, data flow, scalability, reliability, and security.
- **FR-009**: The AI MUST decline off-topic requests and redirect users to ask about their diagram.
- **FR-010**: System MUST validate the node count before forwarding any request to the AI, ensuring oversized diagrams never incur AI processing costs.
- **FR-011**: System MUST apply all validation checks (diagram presence, node count, rate limit, turn limit) before invoking the AI, so that rejected requests incur zero AI cost.
- **FR-012**: System MUST log all abuse-related events (rate limit hits, diagram size rejections, diagram-required rejections, turn limit rejections) with the client IP, event type, and timestamp.

### Key Entities

- **Session**: Represents a single user's interaction lifecycle; tracks conversation turn count and is tied to a connection (not persisted across page refreshes).
- **Rate Limit Entry**: Tracks request count and timestamps per client IP for rate limiting decisions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of requests without a diagram are rejected before reaching the AI.
- **SC-002**: 100% of requests with more than 50 nodes are rejected before reaching the AI.
- **SC-003**: Users sending requests faster than the rate limit receive a rejection within 1 second, with zero AI cost incurred for rejected requests.
- **SC-004**: No single IP can generate more AI requests than the configured rate limit allows, regardless of the number of concurrent sessions from that IP.
- **SC-005**: Conversations are capped at the configured turn limit, with users informed of remaining turns as they approach the limit.
- **SC-006**: Off-topic questions (questions unrelated to the user's diagram or software architecture) are deflected by the AI at least 90% of the time.
- **SC-007**: Legitimate users with diagrams of 50 or fewer nodes experience no degradation — all hardening checks complete in under 100 milliseconds.
- **SC-008**: Starting a new session (page refresh) resets the conversation turn counter, allowing the user to continue using the application.

## Clarifications

### Session 2026-04-09

- Q: What counts as one "conversation turn"? → A: One turn is one user message + one AI response pair (a round-trip exchange).
- Q: How should the system determine client IP behind a reverse proxy? → A: Trust only the rightmost IP set by the immediate reverse proxy; fall back to the direct connection IP when no forwarded header is present (local dev / testing).
- Q: Should abuse events be observable by the operator? → A: Yes — log abuse events (rate limit hits, diagram rejections, off-topic attempts) with IP, event type, and timestamp. No dashboards or alerting needed.

## Assumptions

- In production, the application is deployed behind a reverse proxy that appends the client IP to a forwarded header. The system trusts only the rightmost entry (set by the known proxy), ignoring any client-supplied upstream entries. In local development and testing, no proxy is present, so the system uses the direct connection IP.
- There is no user authentication — all users are anonymous. Rate limiting and turn limits are the primary abuse controls.
- "Session" is scoped to a single WebSocket connection. Refreshing the page creates a new session with a fresh turn count. This is acceptable for a demo application.
- The 50-node limit is a reasonable bound for a demo application. Real-world deployments may need a configurable limit.
- Specific numeric values for rate limits (requests per window) and conversation turn caps are implementation decisions to be determined during planning, but should be conservative given this is a cost-minimization effort.
- The AI topic constraint is a best-effort measure via prompt engineering. It will not be 100% effective against determined prompt injection, but will deter casual misuse.
- Edge connections (edges) do not count toward the 50-node limit — only nodes are counted.
