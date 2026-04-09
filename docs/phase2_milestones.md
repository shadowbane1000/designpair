# Phase 2 Milestones — Make It Good

## Milestone 5 — Expanded Component Library + Scalability

- Full palette: API Gateway, Serverless Function, Database (NoSQL), Object Storage, Event Bus, Stream Processor, CDN, DNS, Firewall, Web Client, Mobile Client, External API
- Component categories in the palette (Compute, Data, Messaging, Network, Clients)
- Component icons or visual differentiation per category
- Scalability annotations: any node can display a replica count (e.g., "×3") indicating horizontal scaling
- AI prompt construction includes scaling context ("this service is scaled to 3 replicas behind a load balancer")
- **Review:** All component types from the architecture doc are available and visually distinct by category. Services show replica counts. AI references scaling in its analysis.

## Milestone 6 — Connections and Flow Refinement

- Unified handles: any handle can be source or target (remove the fixed in/out distinction). Arrow on the edge defines flow direction.
- Edge directionality: one-way (default) or bidirectional arrows
- Reverse edge direction (right-click or edge action to flip the arrow)
- Predefined protocol labels (HTTP, gRPC, async, pub/sub, SQL, TCP) as quick-select options
- Custom text labels still supported
- Edge color defined by protocol type (or user-adjustable)
- Visual distinction between sync and async connections (solid vs dashed lines)
- Prompt construction includes protocol-aware and direction-aware analysis
- **Review:** Connections flow naturally between any handles. Arrows show direction and can be reversed or made bidirectional. Protocol types have distinct colors. AI feedback references sync/async boundaries and data flow direction.

## Milestone 7 — AI Proactivity

- Optional auto-analyze mode: AI comments on meaningful changes (new connection, new component) without user explicitly asking
- Toggle for auto-analyze (off by default)
- Debounced triggers — don't fire on every drag pixel, only on structural changes
- AI observes the delta since last analysis, not the full graph each time
- **Review:** Toggle auto-analyze on. Add a database. AI proactively notes the new component and its connections.

## Milestone 8 — Design Challenges and Prompt Engineering

- Curated design challenge prompts ("Design a URL shortener at scale", "Design a real-time chat system")
- Challenge mode: AI provides the prompt, user builds, AI evaluates against the challenge
- Improved pattern recognition in prompts (CQRS, event sourcing, saga, fan-out, microservices vs monolith)
- **Review:** Select a challenge. Build a diagram. AI provides challenge-aware feedback referencing expected patterns.

## Milestone 9 — Export/Import and Visual Polish

- JSON export/import for diagrams (save/load to file)
- Component icons (SVG) per type
- Responsive layout (palette collapses on narrow screens)
- Better overall styling and visual polish
- **Review:** Export a diagram, close the tab, import it back. All components have icons. Layout works on different screen sizes.
