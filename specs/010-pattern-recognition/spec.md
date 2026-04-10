# Feature Specification: Improved Pattern Recognition

**Feature Branch**: `010-pattern-recognition`  
**Created**: 2026-04-10  
**Status**: Draft  
**Input**: User description: "Enhanced topology analyzer detects higher-level architectural patterns (CQRS, event sourcing, saga, fan-out, API gateway pattern, microservices vs monolith). Detected patterns included in the prompt so the AI can give pattern-aware feedback."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - AI Identifies CQRS Pattern (Priority: P1)

A user builds a diagram with separate read and write paths (e.g., a write service connected to a database, and a read service connected to a read replica or cache). When the user asks the AI for feedback, the AI explicitly identifies "This looks like CQRS" and provides pattern-specific advice (e.g., noting eventual consistency between read and write stores, suggesting event sourcing as a complement).

**Why this priority**: CQRS is the example pattern called out in the milestone review criteria. Detecting separate read/write paths is the foundational detection logic that validates the pattern recognition approach.

**Independent Test**: Build a diagram with separate read/write paths. Send a message to the AI. Verify the AI response references "CQRS" and provides pattern-aware observations.

**Acceptance Scenarios**:

1. **Given** a diagram with a Write Service -> Database and Read Service -> Cache, **When** the user asks the AI to review the architecture, **Then** the AI identifies "CQRS" by name and comments on the separation of read and write concerns.
2. **Given** a diagram with a single service handling both reads and writes to one database, **When** the user asks the AI to review, **Then** the AI does NOT incorrectly identify CQRS (no false positive).

---

### User Story 2 - AI Identifies Multiple Patterns (Priority: P2)

A user builds a complex diagram that exhibits multiple architectural patterns simultaneously (e.g., an API Gateway pattern with a fan-out to microservices, each with their own database). The AI identifies all applicable patterns and provides holistic feedback about how they interact.

**Why this priority**: Real architectures combine multiple patterns. Detecting patterns in isolation is useful, but the AI's value increases significantly when it can reason about pattern interactions.

**Independent Test**: Build a diagram with an API Gateway node fronting 3+ services each with their own database. Verify the AI identifies both "API Gateway pattern" and "microservices" patterns.

**Acceptance Scenarios**:

1. **Given** a diagram with an API Gateway, 3 services, and 3 databases, **When** the user asks for a review, **Then** the AI identifies both the API Gateway pattern and microservices pattern.
2. **Given** a diagram with a queue connecting two services in a chain, **When** the user asks for a review, **Then** the AI identifies the saga or event-driven pattern.

---

### User Story 3 - Pattern Detection in Auto-Analyze Mode (Priority: P3)

When auto-analyze is enabled and the user adds components that complete a recognizable pattern, the AI proactively mentions the emerging pattern in its auto-analysis comment.

**Why this priority**: Extends pattern recognition to the proactive auto-analyze mode, making the feature feel seamless across interaction modes.

**Independent Test**: Enable auto-analyze. Add a queue between two services. Verify the auto-analysis comment references the async/event-driven pattern.

**Acceptance Scenarios**:

1. **Given** auto-analyze is enabled and a simple service-to-database diagram exists, **When** the user adds a queue between the service and database, **Then** the auto-analysis mentions the introduction of an async/event-driven pattern.

---

### Edge Cases

- What happens when a diagram has components that partially match a pattern but are incomplete? The system should detect partial matches and the AI can note what is missing to complete the pattern.
- What happens when an empty canvas is analyzed? No patterns should be detected; the existing empty-canvas prompt remains unchanged.
- What happens when the same diagram matches overlapping patterns? All applicable patterns should be reported without duplication.
- What happens with very small diagrams (1-2 nodes)? Pattern detection should gracefully return no patterns rather than making false-positive matches.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST detect the following architectural patterns from graph topology: CQRS, event sourcing, saga, fan-out, API gateway, microservices, and monolith.
- **FR-002**: System MUST include detected patterns in the prompt text sent to the AI, in a dedicated "Detected Patterns" section of the architecture overview.
- **FR-003**: Each detected pattern MUST include a brief description of what structural evidence triggered the detection (e.g., "separate read/write paths through different services").
- **FR-004**: Pattern detection MUST operate on the same GraphState and TopologyAnalysis data already computed by the existing analyzer, without requiring new data structures from the frontend.
- **FR-005**: Pattern detection MUST be included in both the regular prompt (BuildPrompt) and the auto-analyze prompt (BuildAutoAnalyzeUserMessage).
- **FR-006**: System MUST avoid false positives by requiring minimum structural thresholds for each pattern (e.g., microservices requires 3+ independent services with separate data stores).
- **FR-007**: Pattern detection MUST not break or alter existing topology analysis outputs (entry points, fan-in/out, cycles, etc.).

### Key Entities

- **DetectedPattern**: A recognized architectural pattern with a name, confidence description, and structural evidence summary.
- **PatternDetector**: Logic that examines the graph topology to identify known patterns.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: When a user builds a CQRS-like diagram (separate read/write paths), the AI explicitly names "CQRS" in its response.
- **SC-002**: All 7 target patterns (CQRS, event sourcing, saga, fan-out, API gateway, microservices, monolith) have detection logic with corresponding tests.
- **SC-003**: Pattern detection adds zero false positives on the existing test suite's graph topologies (linear chain, fan-out, shared database, cycle, disconnected components).
- **SC-004**: Existing topology analysis tests continue to pass unchanged.

## Clarifications

### Session 2026-04-10

No critical ambiguities detected. The specification is sufficiently clear for planning:
- Pattern set is explicitly enumerated (7 patterns)
- Scope is backend-only (no frontend changes)
- Detection approach is heuristic/structural (not ML)
- Integration point is the existing prompt builder

## Assumptions

- Pattern detection is heuristic-based, not ML-based. It uses structural graph analysis (node types, edge patterns, connectivity) to identify patterns.
- The AI LLM does the nuanced reasoning about pattern quality and recommendations; the backend just provides the structural detection as context in the prompt.
- No frontend changes are needed for this milestone. Pattern detection is entirely backend (Go) work that enriches the prompt sent to the AI.
- The set of detectable patterns is fixed for this milestone. Adding new patterns later should be straightforward given the detection architecture, but extensibility is not a requirement now.
- Detection thresholds are intentionally conservative to minimize false positives. It is better to miss a pattern than to incorrectly identify one.
