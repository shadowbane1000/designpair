# Phase 2 Milestones — Make It Good

## Milestone 5 — Expanded Component Library + Scalability

- Full palette: API Gateway, Serverless Function, Database (NoSQL), Object Storage, Event Bus, Stream Processor, CDN, DNS, Firewall, Web Client, Mobile Client, IoT Client, External API
- Component categories in the palette (Compute, Data, Messaging, Network, Clients)
- Component icons (lucide-react) with category-colored borders
- Scalability annotations: replica count on supported node types
- AI prompt construction includes scaling context
- **Review:** All 18 component types available and visually distinct by category. Replica counts work on supported types. AI references scaling in analysis.

## Milestone 6 — Connections and Flow Refinement

- Unified handles: any handle accepts connections in either direction
- Edge directionality: one-way (default) or bidirectional arrows
- Reverse edge direction via context menu
- 8 predefined protocols (HTTP, gRPC, SQL, TCP, async, pub/sub, WebSocket, MQTT) + custom text
- Edge color defined by protocol type
- Visual distinction between sync and async connections (solid vs dashed lines)
- User-overridable sync/async classification per edge
- Prompt construction includes protocol-aware and direction-aware analysis
- **Review:** Connections flow naturally between any handles. Protocol types have distinct colors. AI references sync/async boundaries.

## Milestone 7 — AI Collaboration Tools

- AI can suggest changes to the diagram using 6 tools: `add_node`, `delete_node`, `modify_node`, `add_edge`, `delete_edge`, `modify_edge`
- Tools create pending suggestions — user approves or discards all at once
- `modify_node` changes name or replicaCount only (not type — type change requires delete + add)
- `modify_edge` changes protocol, direction, or syncAsync only (not source/target — reconnection requires delete + add)
- Visual treatment: green glow for pending adds, red + strikethrough for pending deletes, "old → new" for pending modifications
- Pending edge deletes with protocol show strikethrough label; without protocol show ×
- Coincident add/delete edges (protocol swap) offset slightly for visibility
- Suggestions accumulate across chat turns until approved or discarded
- Flattened suggestion state: AI deleting a suggested edge removes it; AI adding a node identical to a pending-delete undeletes it
- Three-section prompt: current architecture, proposed changes, architecture after approval
- System prompt instructs AI to use tools directly (not ask permission) — tools create suggestions the user will approve
- Approve All / Discard All buttons
- **Review:** Ask the AI "add a cache between the API and database." Green-glowing cache node and edges appear. Old edge shows red strikethrough. Click Approve — changes commit. Click Discard — diagram reverts.

## Milestone 8 — AI Proactivity

- Optional auto-analyze mode: AI comments on meaningful changes without user asking
- Toggle for auto-analyze (off by default)
- Debounced triggers — only on structural changes, not drag pixels
- AI observes the delta since last analysis, not the full graph each time
- **Review:** Toggle auto-analyze on. Add a database. AI proactively notes the new component and its connections.

## Milestone 9 — Curated Example Diagrams

- Pre-built sample architectures users can load with one click (e.g., e-commerce microservices, real-time chat, URL shortener, IoT pipeline)
- Each example includes a suggested question to ask the AI, auto-filled in the chat input
- Example selector UI (dropdown or card grid) accessible from the header or an empty canvas state
- Examples stored as JSON graph definitions (bundled in frontend, not requiring persistence)
- Loading an example replaces the current canvas (with confirmation if non-empty)
- **Review:** Open the app. Select "E-commerce Microservices." Diagram loads with ~6-8 nodes and connections. Chat input pre-fills "How would you improve the scalability of this system?" Click send — AI analyzes the pre-built architecture.

## Milestone 10 — Improved Pattern Recognition

- Enhanced topology analyzer detects higher-level architectural patterns (CQRS, event sourcing, saga, fan-out, API gateway pattern, microservices vs monolith)
- Detected patterns included in the prompt so the AI can give pattern-aware feedback
- **Review:** Build a diagram with separate read/write paths. AI explicitly identifies "This looks like CQRS" and gives pattern-specific advice.

## Milestone 11 — UX Polish, Export/Import

**Canvas interaction improvements:**
- Auto-layout for AI-added nodes (dagre or ELK) — currently nodes stack at bottom; should integrate naturally into the existing layout
- Smart edge routing: AI-created edges pick sensible handle positions based on relative node placement
- Edge reconnection: drag an edge endpoint to a different node/handle to rewire it
- Edge context menu dismisses on click-away reliably (fix current sticky behavior)

**Diagram management:**
- JSON export/import for diagrams (save/load to file)

**Visual polish:**
- Responsive layout (palette collapses on narrow screens)
- Better overall styling and visual polish

- **Review:** AI adds 3 nodes — they auto-layout without overlapping. Drag an edge from Service to Cache. Right-click an edge, click away — menu dismisses. Export diagram, reload, import it back.
