# ADR-002: React Flow for the Interactive Canvas

**Status:** Accepted  
**Date:** 2026-04-08  
**Deciders:** Tyler Colbert

## Context

DesignPair requires an interactive canvas where users drag, drop, and connect architectural components (services, databases, load balancers, queues, etc.). The canvas needs to support custom node types, labeled edges, zoom/pan, and the ability to serialize the graph state for AI analysis.

## Decision

Use React Flow as the canvas library.

## Rationale

- **Purpose-built for node-based UIs:** React Flow is specifically designed for interactive node/edge graphs — exactly what an architecture diagramming tool needs. It handles pan, zoom, selection, drag, connection, and layout out of the box.
- **Custom nodes and edges:** React Flow allows fully custom React components as nodes. This means each architecture component (database, service, queue, CDN) can be a styled, interactive component with its own metadata and behavior.
- **Serializable state:** React Flow's internal state model (nodes array + edges array) maps cleanly to a JSON representation that can be sent to the backend for AI analysis. This is critical — the AI needs to understand the graph topology.
- **Active ecosystem:** React Flow is widely used (Stripe, Zapier, and others), actively maintained, and has good documentation. It's not a risky dependency.
- **Alternatives are worse fits:** Excalidraw is freeform drawing (not structured nodes/edges). D3 is low-level and would require building all interaction from scratch. Konva/Fabric are canvas-based and don't have graph semantics.

## Alternatives Considered

- **Excalidraw:** Popular freeform whiteboard. Great for sketching, but lacks structured node/edge semantics. The AI needs to reason about a typed graph (service → database), not pixel positions of hand-drawn boxes.
- **tldraw:** Similar to Excalidraw — freeform drawing, not graph-structured.
- **D3.js:** Powerful but low-level. Would require building all interaction (drag, connect, select, zoom) from scratch. Months of work for what React Flow provides out of the box.
- **Custom canvas implementation:** Maximum control, but massive scope for a portfolio project. React Flow lets us focus on the AI collaboration, not canvas mechanics.

## Consequences

### Positive
- Structured graph state (nodes + edges) maps directly to what the AI needs to reason about
- Rich interaction out of the box — drag, connect, zoom, pan, selection
- Custom node components allow polished, branded architecture components
- Well-documented, active community

### Negative
- Dependency on a third-party library for the core interaction model
- React Flow's layout engine is basic — may need to integrate dagre or ELK for auto-layout later
- Some visual customization requires understanding React Flow's internals

### Mitigations
- The graph state serialization format will be our own (not React Flow's internal format), keeping the AI layer decoupled from the canvas library
- Auto-layout is a stretch goal, not a skateboard requirement
