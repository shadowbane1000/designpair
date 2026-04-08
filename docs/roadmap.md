# DesignPair Roadmap

## Phase 1 — Walking Skeleton

Goal: drag components onto a canvas, connect them, click "ask AI," and get a streaming response about your architecture.

**Canvas Foundation**
1. Initialize monorepo: Go module, React/Vite project, Dockerfiles
2. React Flow canvas with custom node types for 4–5 basic components (Service, Database, Cache, Queue, Load Balancer)
3. Component palette with drag-to-canvas
4. Edge creation with basic labels
5. Graph state serialization to JSON
6. CI pipeline (Gitea + GitHub Actions: lint + test + build for both frontend and backend)

**Backend + AI Integration**
7. Go WebSocket server
8. WebSocket client hook in React
9. Anthropic integration — send graph state + question, stream response
10. Graph-to-prompt construction: convert JSON graph into a structured description the LLM can reason about
11. End-to-end: draw → ask → stream response

**Polish + Deploy**
12. AI chat panel with streaming response display
13. Conversation history within a session (AI remembers earlier discussion)
14. Basic prompt for triggering AI analysis ("What do you think?" button + freeform question input)
15. Docker Compose (frontend + backend)
16. Deploy to self-hosted environment
17. README with setup instructions and live demo link

## Phase 2 — Make It Good

- Expand component library (full palette)
- Edge labels and protocols (HTTP, gRPC, async, pub/sub)
- AI proactivity: optionally analyze on every meaningful change, not just on demand
- Curated design challenge prompts ("Design a URL shortener at scale")
- Improved prompt engineering: teach the AI to recognize patterns (CQRS, event sourcing, fan-out, etc.)
- JSON export/import for diagrams
- Visual polish: component icons, better styling, responsive layout
- Write ADRs for every significant decision

## Phase 3 — Make It Impressive

- Architecture diagram in README
- Comprehensive ADR collection
- Meaningful test coverage (WebSocket integration tests, graph serialization tests, prompt construction tests)
- Component annotation (click a node, add notes the AI considers)
- AI conversation memory improvements (summarize long conversations to stay within context window)
- Blog post or README walkthrough of the graph-to-prompt challenge

## Phase 4 — Optional Stretch

- Sharable diagram links (requires persistence)
- Export to Mermaid / draw.io format
- Auto-layout (dagre or ELK integration)
- Multiplayer (two people on the same canvas via CRDT)
- Multiple LLM backends
- "Playback" mode — watch a diagram being built step by step
