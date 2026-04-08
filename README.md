# DesignPair

Interactive architecture canvas with a real-time AI collaborator.

You diagram your system by dragging and connecting components, and the AI engages as you build — asking probing questions, flagging risks, and suggesting improvements. It's a thinking partner for architectural work, not a scoring tool or diagram generator.

## Why This Project Exists

This is the second portfolio project for Tyler Colbert (alongside [ADR Insight](https://github.com/tcolbert/adr-insight)), targeting Principal Engineer / Staff+ roles. Together the two projects demonstrate:

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

_Coming soon — project is in early development._

## Documentation

- [Architecture](docs/architecture.md) — system overview, data flow, component library
- [Roadmap](docs/roadmap.md) — phased development plan
- [Architecture Decision Records](docs/adr/) — significant design decisions
