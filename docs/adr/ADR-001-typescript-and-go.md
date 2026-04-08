# ADR-001: TypeScript Frontend + Go Backend

**Status:** Accepted  
**Date:** 2026-04-08  
**Deciders:** Tyler Colbert

## Context

DesignPair is a portfolio project alongside ADR Insight (which is pure Go). The project needs to demonstrate full-stack breadth while deepening Go proficiency. It involves a rich interactive canvas UI and a backend that manages WebSocket connections and LLM API calls.

## Decision

Use TypeScript with React for the frontend, and Go for the backend API server.

## Rationale

- **Portfolio breadth:** ADR Insight is Go-only. DesignPair adds TypeScript/React to the portfolio, showing a hiring manager full-stack range rather than one-language depth.
- **React Flow:** The canvas requires a mature node/edge graph library. React Flow is the dominant solution in this space — well-documented, actively maintained, and purpose-built for interactive node-based UIs.
- **Go backend deepens proficiency:** A second Go project builds on the learning from ADR Insight. The backend here is different in character (WebSocket server, real-time streaming, stateless request handling) vs. ADR Insight (RAG pipeline, SQLite, batch indexing), showing Go versatility.
- **TypeScript for the right reasons:** The frontend has complex state management (canvas state, AI conversation state, component library). TypeScript's type system catches bugs that would be painful in plain JavaScript at this complexity level.
- **Ecosystem match:** React + TypeScript is the most common frontend stack in the industry. This isn't a novel choice — it's the pragmatic one, which is the right signal for a senior engineer.

## Consequences

### Positive
- Portfolio now spans Go + TypeScript/React — strong full-stack signal
- React Flow eliminates the need to build a canvas from scratch
- Two Go projects show growing proficiency and range within the language
- TypeScript is immediately readable to most hiring managers

### Negative
- Two languages means two build systems, two sets of tooling, more CI complexity
- Tyler is learning Go and refreshing TypeScript simultaneously
- Monorepo vs. polyrepo decision is forced (see ADR-006)

### Mitigations
- Keep the Go backend focused — it's a thin API layer and WebSocket server, not a complex domain
- Use well-established tooling (Vite for frontend, standard Go project layout for backend)
- CI handles both with separate build steps in the same pipeline
