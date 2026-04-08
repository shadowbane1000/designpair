# ADR-005: No Server-Side Persistence in V1

**Status:** Accepted  
**Date:** 2026-04-08  
**Deciders:** Tyler Colbert

## Context

DesignPair needs to decide whether diagrams and conversation history persist between sessions in the initial release. Persistence adds value (users can return to their work) but also adds scope (database selection, schema design, authentication, user accounts).

## Decision

V1 has no server-side persistence. Diagram state lives in browser memory. Closing the tab loses the diagram.

## Rationale

- **Skateboard principle:** The core value proposition is the AI collaborator, not diagram storage. Every hour spent on persistence is an hour not spent on making the AI feedback loop excellent.
- **Scope control:** Persistence implies user accounts, authentication, and a database — each a significant feature. For a portfolio project, these are undifferentiated infrastructure that doesn't showcase leadership thinking or AI depth.
- **The live demo still works:** A hiring manager visiting the demo creates a diagram, gets AI feedback, and sees the value in one session. They don't need to come back tomorrow to be impressed.
- **Clean architecture signal:** Intentionally deferring persistence shows disciplined scope management — a principal engineer skill. The architecture can be documented to show where persistence would plug in.

## Alternatives Considered

- **LocalStorage/IndexedDB in the browser:** Low-effort persistence without backend changes. Considered but deferred — it adds frontend complexity and the demo works fine without it.
- **Server-side with SQLite:** Consistent with ADR Insight's approach. Deferred to roadmap — would require user identity, even if anonymous/session-based.
- **JSON export/import:** Let users download their diagram as JSON and reload it later. Low-cost option that may be added in Phase 2.

## Consequences

### Positive
- Dramatically reduced scope for v1
- No database, no auth, no user management
- Backend stays stateless (easier to deploy, scale, and reason about)
- Forces focus on the core AI collaboration experience

### Negative
- Users lose their work when they close the tab
- Can't share diagrams via URL
- The live demo resets for each visitor

### Mitigations
- Document the persistence roadmap in CONTEXT.md so it's clear this is intentional scoping, not oversight
- JSON export/import is a near-term Phase 2 feature
- The AI conversation can reference the current diagram state at any point, so losing history doesn't degrade the AI experience
