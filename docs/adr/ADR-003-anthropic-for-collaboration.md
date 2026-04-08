# ADR-003: Anthropic Claude for AI Collaboration

**Status:** Accepted  
**Date:** 2026-04-08  
**Deciders:** Tyler Colbert

## Context

DesignPair needs an LLM that can analyze a serialized architecture graph and produce thoughtful, contextual feedback — identifying risks, asking probing questions, and suggesting improvements. The AI needs to:

- Reason about system topology (single points of failure, missing redundancy, blast radius)
- Understand common architectural patterns (CQRS, event sourcing, microservices, etc.)
- Maintain conversational context across multiple interactions as the diagram evolves
- Stream responses in real time for a responsive user experience

## Decision

Use Anthropic's Claude API for the AI collaborator.

## Rationale

- **Consistency with ADR Insight:** Using the same LLM provider across both portfolio projects means one API key, one billing relationship, and demonstrated familiarity with Anthropic's API.
- **Strong reasoning over structured data:** Claude handles structured input (JSON graph representations) well and produces nuanced architectural analysis — not just surface-level observations.
- **Long context window:** As diagrams grow complex, the serialized graph state plus conversation history could become large. Claude's context window accommodates this without aggressive truncation.
- **Streaming support:** Anthropic's API supports server-sent events for streaming responses, which integrates well with the WebSocket-based real-time architecture (the backend receives SSE from Anthropic and forwards via WebSocket to the client).

## Alternatives Considered

- **OpenAI GPT-4:** Equally capable for this use case. Rejected because using a different provider than ADR Insight would require Tyler to manage two API accounts and wouldn't add meaningful portfolio signal. The abstraction layer allows adding OpenAI support later.
- **Local models (Ollama):** Architectural reasoning requires strong performance on complex, multi-faceted analysis. Local models in the 7B–13B range aren't reliable enough for nuanced feedback like "this queue between service A and B introduces eventual consistency — is that acceptable for your checkout flow?" Cloud API is the right choice here.

## Consequences

### Positive
- Consistent tooling across portfolio projects
- High-quality architectural reasoning
- Streaming support for real-time UX
- Single API key for users running both DesignPair and ADR Insight

### Negative
- External API dependency — users need an Anthropic API key
- Cost per interaction (manageable at portfolio/demo scale)
- Vendor coupling on the AI reasoning layer

### Mitigations
- Abstract the LLM behind a Go interface, same pattern as ADR Insight
- Document API key setup clearly
- Multi-provider support is a roadmap item
