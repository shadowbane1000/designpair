# ADR-009: AI Tool Use for Collaborative Diagram Editing

**Status:** Accepted
**Date:** 2026-04-09
**Deciders:** Tyler Colbert

## Context

DesignPair's AI collaborator can analyze architecture diagrams and provide feedback, but it cannot act on the diagram. When the AI suggests "add a cache between the API and the database," the user must manually create the node and edges. This creates friction in the pairing experience — a real collaborator would sketch the suggestion on the whiteboard, not just describe it.

We need a mechanism for the AI to propose concrete changes to the diagram that the user can review and accept or reject.

## Decision

Use Claude's tool_use API (function calling) to give the AI 6 diagram editing tools: `add_node`, `delete_node`, `modify_node`, `add_edge`, `delete_edge`, `modify_edge`. Tool calls create pending suggestions with visual treatment (green glow for adds, red strikethrough for deletes, "old → new" for modifications). The user approves or discards all suggestions as a batch.

The system prompt instructs the AI to use tools directly when asked to modify the architecture — not describe what it would do and ask permission. The tools create suggestions, so the user always has the final say.

## Rationale

- **Tool use is a native Claude feature:** The API provides structured tool definitions, streaming tool call events, and tool result handling. No custom parsing or prompt engineering needed — Claude knows how to call tools reliably.
- **Suggest-then-approve preserves user agency:** Per constitution Principle I (Collaborator, Not Judge), the AI should not unilaterally modify the diagram. The pending suggestion pattern lets the AI act while the user decides.
- **Visual suggestions are more powerful than text descriptions:** Seeing a green-glowing cache node on the diagram communicates the suggestion more clearly than reading "I would add a cache node connected to..."
- **Multi-turn accumulation enables iterative design:** Suggestions accumulate across chat turns, letting the user refine with "now also add a load balancer" before committing. The AI sees pending state and builds on it.
- **Three-view prompt prevents confusion:** The AI receives the current state, the proposed changes, and the merged view — so it can reason about both what exists and what's been suggested without conflating the two.

## Alternatives Considered

- **Text-only suggestions with manual execution:** The current approach. The AI describes changes and the user implements them. Works but creates friction, especially for multi-step changes (add node + delete edge + add 2 edges).
- **Immediate execution (no pending state):** The AI's tool calls modify the diagram directly. Faster but violates Principle I — the user loses agency. Also makes multi-turn suggestions impossible (can't undo intermediate steps).
- **Custom JSON format in AI response:** Instead of tool_use, the AI outputs a structured JSON block describing changes, and the frontend parses it. Fragile (depends on AI following format exactly), no streaming support for individual operations, and doesn't benefit from Claude's native tool calling reliability.
- **Separate "edit mode" for AI:** A toggle where the AI's suggestions automatically apply. Rejected because it splits the experience — the AI should always be collaborative, not switch between advisory and executive modes.

## Consequences

### Positive
- The AI becomes an active collaborator — it can sketch ideas on the diagram, not just talk about them
- Visual suggestions are immediately understandable — the user sees the proposed architecture
- Multi-turn suggestion accumulation enables iterative refinement before committing
- Tool use reliability is high — Claude's native function calling is more robust than prompt-engineered JSON
- Pending state in the prompt enables the AI to build on its own suggestions

### Negative
- Significant implementation complexity: pending state management, flattening logic, visual treatment for 3 states (add/delete/modify), coincident edge handling
- Tool call streaming adds complexity to the WebSocket handler (must accumulate partial JSON, validate, send results back)
- The three-view prompt increases token usage per request
- All-or-nothing approve/discard limits flexibility (per-suggestion approve is future work)
- Node name uniqueness constraint (required for tool call addressing) is a new restriction on user behavior

### Mitigations
- Pending state stored as a separate overlay — keeps committed state clean, makes approve/discard trivial
- Flattening rules handle contradictory suggestions automatically
- Node name uniqueness auto-suffixes prevent conflicts without user friction
- The three-view prompt is well-structured with clear section headers — token cost is manageable
- All-or-nothing is a reasonable MVP; per-suggestion approve can be added later without rearchitecting

## Related ADRs

- ADR-003: Anthropic for Collaboration (this ADR extends the Claude integration with tool_use)
- ADR-008: Graph-to-Prompt Hybrid (this ADR extends the prompt format to three views)
