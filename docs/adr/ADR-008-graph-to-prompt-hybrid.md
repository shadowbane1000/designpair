# ADR-008: Hybrid Graph-to-Prompt Strategy

**Status:** Accepted
**Date:** 2026-04-09
**Deciders:** Tyler Colbert

## Context

The constitution identifies graph-to-prompt construction as the core technical challenge of DesignPair (Principle IV: The Prompt Is the Product). Given a JSON graph of typed nodes and directed edges, we need to construct a prompt that enables an LLM to reason about architectural properties — single points of failure, scaling bottlenecks, missing components, pattern recognition. The quality of the AI's feedback depends entirely on how well the graph is represented in the prompt.

## Decision

Use a hybrid prompt format: a pre-computed natural language topology summary (generated server-side) combined with the raw JSON graph as a fenced appendix.

## Rationale

- **Natural language enables reasoning:** LLMs reason more effectively over natural language descriptions than raw JSON. A topology summary like "API Gateway fans out to 3 services, all of which write to a single shared database" immediately communicates the architectural concern. Forcing the LLM to derive this from JSON arrays is unreliable.
- **JSON provides precision:** The raw graph as an appendix gives the LLM a ground-truth reference when it needs to cite specific node names, connection labels, or verify a detail from the summary.
- **Server-side analysis is deterministic:** Pre-computing topology metrics (fan-in/fan-out, entry points, single points of failure, cycles) in Go means the analysis is consistent, testable, and fast. The LLM doesn't need to spend tokens on graph traversal.
- **Separation of concerns:** The topology analyzer is a pure function (graph in, analysis out) that can be unit-tested independently of the LLM. The prompt template is a separate concern that assembles the pieces.

### Pre-computed topology properties

The Go `graph/analyzer.go` computes:
- Fan-in/fan-out per node (coupling and bottleneck indicators)
- Entry points (zero incoming edges) and leaf nodes (zero outgoing edges)
- Single points of failure (articulation points)
- Connected components (disconnected subgraphs)
- Cycles (circular dependencies)
- Edge label distribution (protocol analysis)
- Node type distribution

## Alternatives Considered

- **Raw JSON only:** Simplest approach — send `{"nodes": [...], "edges": [...]}` directly. But LLMs struggle with graph traversal in JSON. They miss structural patterns that are obvious visually (e.g., a fan-out pattern or a missing load balancer). Testing with raw JSON produced generic, surface-level responses.
- **Natural language only:** Describe the graph entirely in prose. Loses precision — the LLM may hallucinate connections or misremember node names without a JSON reference. Also harder to construct programmatically for complex graphs.
- **Visual/image-based:** Send a screenshot of the diagram to a multimodal model. Violates Principle II (Graph Semantics Over Pixels) — the AI should reason about typed topology, not pixel positions. Also much more expensive and slower.

## Consequences

### Positive
- The topology analyzer is independently testable — the most critical code path has the best test coverage
- Natural language summary produces higher-quality AI reasoning about architectural patterns
- JSON appendix prevents hallucination about specific components
- Server-side analysis keeps prompt construction deterministic and fast
- The hybrid format scales: for larger diagrams, the summary can be hierarchical while JSON stays complete

### Negative
- Two representations to keep in sync (summary + JSON) — a bug in the analyzer could produce a misleading summary
- More complex prompt construction than a simple JSON dump
- The topology analyzer needs to be kept up to date as new node types are added

### Mitigations
- Extensive unit tests for the topology analyzer (the most important test surface in the project)
- The JSON appendix serves as a self-correcting mechanism — if the summary is wrong, the LLM can cross-reference the JSON
- New node types only need to be added to the type enum; the analyzer operates on generic graph properties

## Related ADRs

- ADR-003: Anthropic for Collaboration (this ADR defines how graph state is presented to the Claude API)
- ADR-002: React Flow Canvas (the graph state serialized from React Flow is the input to this prompt construction)
