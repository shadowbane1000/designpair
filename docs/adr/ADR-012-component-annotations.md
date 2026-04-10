# ADR-012: Component Annotations

**Status:** Accepted
**Date:** 2026-04-10
**Deciders:** Tyler Colbert

## Context

DesignPair's graph-to-prompt pipeline (ADR-008) passes node types, names, replica counts, and topology to the AI. However, users often need to convey domain-specific intent that isn't captured by the component type alone -- e.g., "this database stores only user sessions" or "this service handles payment processing." Without annotations, the AI can only reason from structural topology, missing the semantic layer.

M12 calls for per-component free-text annotations that are included in the AI prompt and serialized in the graph state.

## Decision

Add an optional `annotation` string field to graph nodes. Annotations are edited via a popover panel that opens when the user clicks an annotation badge on the node header. Annotations are:

1. Stored in React node data (`ArchitectureNodeData.annotation`)
2. Serialized in the graph state JSON (`SerializedNode.annotation`, `GraphNode.Annotation`)
3. Included in the AI prompt both in the natural language component listing and the JSON appendix
4. Omitted from serialization and prompt when empty (zero noise for unannotated nodes)

The annotation panel is a fixed-position popover near the click point, with click-outside-to-close behavior. A React Context (`AnnotationContext`) passes the click handler from App to BaseNode without threading props through ReactFlow's node type registration.

## Rationale

- **Popover over side drawer**: A popover keeps the user's spatial context -- they see the node they're annotating. A side drawer would require visually mapping between the drawer and the canvas node.
- **React Context for click handler**: ReactFlow registers node types statically. Props can't be threaded through the type registration. Context is the standard React pattern for this.
- **Derived state for panel visibility**: When a node is deleted while its annotation panel is open, the panel disappears via derived state (`activeAnnotationPanel`) rather than a `useEffect` with `setState`. This avoids React lint warnings about setState in effects and is more idiomatic.
- **`omitempty` everywhere**: Annotations are optional. Empty annotations produce zero bytes in JSON and zero lines in the prompt, keeping unannotated graphs unchanged.

## Alternatives Considered

- **Side drawer panel**: Rejected -- loses spatial context, adds layout complexity.
- **Inline editing on the node**: Rejected -- nodes are already dense with name input, replica controls, and handles. Adding a textarea would make nodes too large.
- **Modal dialog**: Rejected -- too heavy for a quick annotation. Popovers are lighter and keep canvas visible.

## Consequences

### Positive
- AI can reason about component purpose, not just type and topology
- Zero overhead for users who don't use annotations (omitted from serialization and prompt)
- Annotations survive export/import via the serialized graph state
- Pattern is extensible to edge annotations in a future milestone

### Negative
- Popover positioning requires boundary-aware logic to avoid going off-screen
- Long annotations could make the prompt verbose (mitigated by user discretion)

## Related ADRs

- ADR-008: Graph-to-Prompt Hybrid (annotations extend the prompt content)
- ADR-005: No Persistence v1 (annotations are session-only, consistent with no-persistence design)
