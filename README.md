# DesignPair

Interactive architecture canvas with a real-time AI collaborator.

You diagram your system by dragging and connecting components, and the AI engages as you build — asking probing questions, flagging risks, and suggesting improvements. It's a thinking partner for architectural work, not a scoring tool or diagram generator.

## Why This Project Exists

This is the second portfolio project for Tyler Colbert (alongside [ADR Insight](https://github.com/shadowbane1000/adrinsight)), targeting Principal Engineer / Staff+ roles. Together the two projects demonstrate:

| | ADR Insight | DesignPair |
|---|---|---|
| **Language** | Go | TypeScript (React) + Go |
| **AI pattern** | RAG (retrieve + synthesize) | Real-time conversational (streaming analysis) |
| **Interaction** | Text query → text answer | Visual canvas → streaming AI dialogue |
| **Domain** | Decision documentation | System architecture design |

DesignPair fills the gaps ADR Insight doesn't cover: visual/interactive UI, TypeScript/React, WebSocket real-time communication, and a different AI integration pattern (conversational analysis vs. RAG).

## Stack

- **Frontend:** TypeScript, React, React Flow, Vite
- **Backend:** Go
- **Communication:** WebSocket (bidirectional, real-time)
- **LLM:** Anthropic Claude API (streaming via SSE)
- **Deployment:** Docker Compose, self-hosted

## Getting Started

### Prerequisites

- Node.js v20+
- Go 1.26+
- Docker (for building container images)

### Setup

```bash
git clone ssh://git@192.168.0.41:30009/tyler/designpair.git
cd designpair
cd frontend && npm install && cd ..
```

### Development

```bash
make dev
```

This starts:
- Frontend dev server at http://localhost:5173 (Vite, hot reload)
- Backend server at http://localhost:8081

### Verify

```bash
curl http://localhost:8081/health
# {"status":"ok"}
```

### Lint & Test

```bash
make lint    # ESLint + golangci-lint
make test    # Vitest + go test
```

### Build Docker Images

```bash
make build-all
```

## Documentation

- [Architecture](docs/architecture.md) — system overview, data flow, component library
- [Roadmap](docs/roadmap.md) — phased development plan
- [Architecture Decision Records](docs/adr/) — significant design decisions
