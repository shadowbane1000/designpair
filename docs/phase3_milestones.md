# Phase 3 Milestones — Make It Impressive

## Milestone 12 — Component Annotations

- Click a node to open an annotation popover
- Free-text notes per component (e.g., "Handles 10K RPS", "Uses Redis Cluster mode")
- Annotations included in the AI prompt so the AI considers user-provided context
- Annotations serialized in graph state (included in export/import)
- **Review:** Click a service node, add "This handles authentication for all downstream services." Ask the AI to analyze — it references the annotation in its feedback.

## Milestone 13 — AI Conversation Memory

- Summarize long conversations to stay within context window
- When conversation approaches token limit, summarize older turns into a compact context block
- Summary preserves key decisions, identified issues, and diagram evolution
- User sees a visual indicator when conversation has been summarized
- **Review:** Have a 15+ turn conversation. Notice the summary indicator appears. AI still references earlier discussion points accurately.

## Milestone 14 — Test Coverage and Quality

- WebSocket integration tests (connect, message flow, reconnection)
- Graph serialization round-trip tests (serialize → deserialize → compare)
- Prompt construction tests with complex topologies (cycles, disconnected subgraphs, high fan-out)
- Pattern detection tests (all 7 patterns, false positive prevention)
- E2E tests for full user journeys (load example → chat → approve suggestions → export)
- Frontend component tests (ChatPanel, ExampleSelector, EdgeContextMenu)
- **Review:** Run `make test` — all integration and E2E tests pass with comprehensive coverage of critical paths.

## Milestone 15 — Documentation and Portfolio Polish

- README with project description, key features, and graph-to-prompt challenge walkthrough
- Architecture doc updated to reflect all milestones (M5-M13)
- Tech stack, quick start instructions, and live demo link
- **Review:** A visitor to the GitHub repo understands what DesignPair does, how it works technically, and can try it immediately via the demo link.
