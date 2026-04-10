# ADR-011: Structural Pattern Recognition via Heuristic Detection

**Status:** Accepted
**Date:** 2026-04-10
**Deciders:** Tyler Colbert

## Context

DesignPair's prompt construction (ADR-008) already includes topology analysis — fan-in/fan-out, entry points, single points of failure, cycles. However, it does not identify higher-level architectural patterns like CQRS, event sourcing, or microservices. The AI can sometimes infer these from the raw topology, but it's inconsistent. Explicitly detecting and naming patterns in the prompt gives the AI reliable context for pattern-aware feedback.

The milestone (M10) calls for detecting: CQRS, event sourcing, saga, fan-out, API gateway, microservices, and monolith.

## Decision

Implement pattern detection as structural heuristics in Go, integrated into the existing `TopologyAnalysis` struct. Each pattern has a detector function that examines node types, edge properties, and connectivity to determine if the pattern is present. Detected patterns are included in the prompt as a dedicated "Detected Patterns" section with evidence descriptions.

## Rationale

- **Deterministic and testable**: Heuristic detection is a pure function on graph state. Each detector can be unit-tested with specific graph topologies, ensuring consistent behavior.
- **Fast**: Simple graph traversal, no external calls. Detection adds negligible latency (<1ms for typical graphs).
- **Conservative thresholds**: Each pattern requires specific structural evidence before reporting. False positives are worse than false negatives — the AI can still reason about partial patterns from the raw topology data.
- **Integrated with existing analysis**: The `Analyze()` function already computes fan-in/fan-out, entry points, etc. Pattern detection reuses this data, adding a `DetectedPatterns` field to `TopologyAnalysis`.

### Detection approach per pattern

- **CQRS**: Separate read/write paths through different services to different data stores
- **Event Sourcing**: Event bus/stream processor feeding derived views, services reading from stream not database
- **Saga**: 3+ services connected via async messaging (queues/event buses)
- **Fan-out**: Node with 3+ outgoing edges to same-type targets
- **API Gateway**: Gateway/LB node fronting multiple services with client connections
- **Microservices**: 3+ services each with dedicated data stores
- **Monolith**: Single service handling all data store and client connections

## Alternatives Considered

- **LLM-based detection**: Ask the AI to identify patterns from the graph data. Rejected — adds latency, cost, and creates a circular dependency (we're enriching the prompt to help the AI, not asking the AI to enrich the prompt).
- **ML classifier**: Train a model to classify graph topologies. Rejected — requires training data we don't have, adds operational complexity, and 7 well-defined patterns don't justify ML overhead.
- **Confidence scores (0.0-1.0)**: Report detection confidence per pattern. Rejected for M10 — adds complexity without clear benefit. Binary detection with evidence descriptions is sufficient for the AI to reason about patterns.

## Consequences

### Positive
- AI gives pattern-specific advice (e.g., "This looks like CQRS — have you considered eventual consistency between your read and write stores?")
- Detection logic is independently testable with table-driven Go tests
- No new dependencies or frontend changes required
- Evidence descriptions help the AI explain why it identified a pattern

### Negative
- Heuristic detection can miss patterns that don't match the expected structural signature
- New patterns require new detector functions (not extensible without code changes)
- Node type names must be kept in sync between frontend component types and backend detection logic

### Mitigations
- Conservative thresholds minimize false positives; the AI can still reason about partial patterns from topology data
- Each detector is isolated in its own function, making it straightforward to add new patterns later
- Node type strings are already shared between frontend and backend via the WebSocket protocol

## Related ADRs

- ADR-008: Graph-to-Prompt Hybrid (this extends the prompt format with pattern detection)
- ADR-003: Anthropic for Collaboration (patterns enrich the context sent to Claude)
