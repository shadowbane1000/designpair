# Research: Improved Pattern Recognition

## Pattern Detection Heuristics

### Decision: Structural heuristic detection based on node types and edge topology
**Rationale**: The graph state already contains typed nodes and labeled/protocol-aware edges. Pattern detection can be done with straightforward graph traversal — no ML or external libraries needed.
**Alternatives considered**:
- ML-based classification: Rejected — overkill for 7 well-defined patterns, requires training data we don't have
- LLM-based detection (ask the AI to identify patterns): Rejected — adds latency, cost, and circular dependency; the point is to give the LLM pre-computed structural context

### Pattern Detection Rules

Each pattern has a structural signature detectable from node types and edge properties:

1. **CQRS**: Separate read and write paths. Detect: 2+ paths from entry points to data stores where at least one path is read-dominant (cache, read replica) and another is write-dominant (primary database).

2. **Event Sourcing**: Event store as the source of truth with derived views. Detect: an event bus/stream processor connected to a database, with services reading from the stream rather than the database directly.

3. **Saga**: Distributed transaction across services via messaging. Detect: 3+ services connected in a chain or star pattern through queues/event buses (async edges).

4. **Fan-out**: Single entry point distributing to multiple downstream services. Detect: a node with fan-out >= 3 where targets are the same type (services).

5. **API Gateway**: Single entry point for external clients routing to backend services. Detect: an apiGateway/loadBalancer node type with multiple outgoing edges to services, and client nodes connecting to it.

6. **Microservices**: Multiple independent services with their own data stores. Detect: 3+ services each with at least one dedicated database/cache (not shared).

7. **Monolith**: Single service handling all concerns. Detect: exactly 1 service node connected to all data stores and receiving all client connections.

### Decision: Add DetectedPattern slice to TopologyAnalysis struct
**Rationale**: Keeps pattern detection integrated with existing analysis flow. The prompt builder already receives TopologyAnalysis and can iterate over detected patterns.
**Alternatives considered**:
- Separate PatternAnalysis struct: Rejected — unnecessary separation when patterns are derived from the same graph state
- Map[string]bool for pattern presence: Rejected — need evidence strings, not just booleans

### Decision: Conservative detection thresholds
**Rationale**: False positives are worse than false negatives. The AI can still reason about partial patterns from the raw topology. Better to under-detect than to confidently name a pattern that doesn't exist.
**Alternatives considered**:
- Confidence scores (0-1): Rejected — adds complexity without clear benefit; the AI doesn't need a confidence number to reason about a pattern
- Partial match reporting: Deferred — could be added later, but for M10 we report only confident detections
