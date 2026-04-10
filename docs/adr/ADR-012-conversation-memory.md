# ADR-012: AI Conversation Memory via LLM Summarization

**Status:** Accepted
**Date:** 2026-04-10
**Deciders:** Tyler Colbert

## Context

The existing `ConversationManager` maintains conversation history with a token budget. When the budget is exceeded, it drops the oldest user+assistant turn pairs. This works but has a significant drawback: the AI loses all context from earlier discussion — key decisions, identified issues, and the evolution of the diagram. In long conversations (15+ turns), this can cause the AI to repeat advice, contradict earlier suggestions, or lose track of what has been discussed.

Milestone 13 requires replacing this drop-oldest approach with intelligent summarization that preserves key architectural context.

## Decision

When the conversation approaches 75% of the token budget, trigger a summarization pass using Claude. The oldest turns are summarized into a compact context block that replaces them, preserving key decisions, identified issues, and diagram evolution. A `conversation_summarized` WebSocket message notifies the frontend to display a visual indicator.

### Key design choices

- **Summarizer interface**: A `Summarizer` interface behind which the LLM call lives, keeping `ConversationManager` testable with a mock
- **Summary as user turn**: Stored as a `ConversationTurn` with `Role: "user"` and a `[Conversation Summary]` prefix
- **Progressive re-summarization**: If summary + recent turns still exceeds budget, the summary gets re-summarized with the next batch
- **4 preserved pairs**: Most recent 4 turn pairs (8 turns) are kept verbatim for immediate context continuity
- **No persistence**: Summaries live in memory only, consistent with ADR-005

### WebSocket protocol addition

New server-to-client message: `conversation_summarized` with originalTurnCount, retainedTurnCount, and summaryTokenEstimate.

## Rationale

- **LLM summarization over heuristic extraction**: The AI best understands what's architecturally significant in the conversation
- **75% threshold**: Leaves headroom for the new user message + AI response
- **Interface-based Summarizer**: Keeps ConversationManager unit-testable without API calls

## Consequences

- **Positive**: AI maintains awareness of earlier discussion in long conversations
- **Positive**: Token budget used more efficiently — summary is compact vs. raw turns
- **Negative**: Summarization adds one extra LLM call when triggered
- **Negative**: Summary may lose some nuance from early conversation — acceptable vs. complete loss
