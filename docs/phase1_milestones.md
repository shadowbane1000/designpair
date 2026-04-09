# Phase 1 Milestones — Walking Skeleton

## Milestone 1 — Empty Canvas

- Initialize monorepo: Go module (`backend/`), React/Vite project (`frontend/`), Dockerfiles
- React Flow canvas renders in the browser (empty, pannable, zoomable)
- CI pipeline: lint + test + build for both languages
- **Review:** `make dev` starts both services, you see a blank canvas in the browser. CI passes on push.

## Milestone 2 — Drag and Connect

- 5 custom node types: Service, Database, Cache, Queue, Load Balancer
- Component palette with drag-to-canvas
- Edge creation with basic labels
- Graph state serialization to JSON (visible in console or debug panel)
- **Review:** You can drag components from a palette, connect them, and inspect the JSON representation of what you've built.

## Milestone 3 — AI Responds

- Go WebSocket server
- WebSocket client hook in React
- Graph-to-prompt construction
- Anthropic streaming integration
- Minimal chat panel showing the streamed response
- **Review:** Draw a few components, click "Ask AI", and get a streaming architectural critique back in a chat panel. End-to-end works.

## Milestone 4 — Deployable Skeleton

- Conversation history within a session
- Freeform question input (not just one button)
- Docker Compose for frontend + backend
- Deploy to `designpair.colberts.us`
- README with setup instructions
- **Review:** Live at a URL. You can have a multi-turn conversation with the AI about your diagram.
