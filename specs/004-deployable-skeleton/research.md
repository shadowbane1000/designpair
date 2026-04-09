# Research: Deployable Skeleton

## Multi-Turn Conversation Management

- **Decision**: Sliding window — keep the most recent N turn pairs, drop oldest when approaching context limit
- **Rationale**: Simple, predictable, no latency from summarization. 200K token context on claude-sonnet-4-5 is generous — a sliding window of ~20 turns is more than enough for architecture conversations.
- **Alternatives considered**: Summarize older turns (adds latency and complexity, overkill for v1), always send full history (risks context overflow on long sessions)

### Context Budget

- System prompt + graph state: ~40K tokens reserved
- Conversation history: up to ~120K tokens (sliding window)
- Response: ~40K tokens reserved
- Estimation: ~4 chars/token for English, ~3 for JSON. Proactive trimming with error handling as safety net.

## Graph State Per Turn

- **Decision**: Send current graph state with every API request, embedded in the latest user message
- **Rationale**: Claude is stateless per request. The diagram may change between turns. Stale state produces wrong analysis.
- **Alternatives considered**: Only send on change (requires diff tracking, risks stale state on missed updates)

## Freeform Input Replacing Ask AI Button

- **Decision**: Single text input field in the chat panel footer. Empty submission sends default "Analyze my architecture" prompt.
- **Rationale**: Cleaner UX — one interaction point instead of two. Empty-submit preserves the one-click analysis for users who don't want to type.
- **Alternatives considered**: Keep both button and input (confusing), button-only with modal input (interrupts flow)

## Frontend WebSocket URL

- **Decision**: Use relative URL derived from `window.location` — `wss://${host}/ws` for HTTPS, `ws://${host}/ws` for HTTP
- **Rationale**: No build-time configuration needed. Works identically in development (localhost:5173 with Vite proxy or direct) and production (designpair.colberts.us).
- **Alternatives considered**: Build-time env var (requires different builds per environment), hardcoded URL (breaks across environments)

## Docker Compose Deployment Architecture

- **Decision**: Frontend nginx container publishes port 8083, handles all traffic routing (static files + /ws proxy to backend). Backend container exposes port 8081 internally only.
- **Rationale**: Single upstream for host nginx (simpler config). Frontend container owns all routing — same pattern as adrinsight. WebSocket upgrade headers at both proxy layers.
- **Alternatives considered**: Both containers publish ports with host nginx routing per path (more host nginx config, harder to maintain), single container (loses separation of concerns)

## CI/CD Deploy Pattern

- **Decision**: Same pattern as adrinsight — build both images in CI, `docker save` both into one tarball, scp to server, `docker load`, `docker compose up -d`
- **Rationale**: Proven pattern, already working for adrinsight and designpair-adrs
- **Key difference**: Two images instead of one in the tarball; stop app before upload to avoid partial state

## Vite Proxy for Development

- **Decision**: Add Vite proxy config to forward `/ws` and `/health` to `localhost:8081` during development
- **Rationale**: With relative WebSocket URLs, the frontend dev server (port 5173) needs to proxy WebSocket connections to the backend (port 8081). Vite's built-in proxy handles this cleanly.
- **Alternatives considered**: CORS-based direct connection (already working but requires hardcoded port in frontend code)
