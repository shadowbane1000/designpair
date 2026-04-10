# Quickstart: AI Proactivity

## What This Feature Does

Adds an optional "auto-analyze" mode to DesignPair. When enabled, the AI automatically comments on meaningful changes to the architecture diagram without the user having to ask. The AI observes what changed (the delta) and provides focused feedback.

## How to Test

1. Start the app: `make dev` (or `docker compose up`)
2. Open the browser to the app URL
3. Add a Service node and a Database node, connect them with an edge
4. In the chat panel, click the auto-analyze toggle to enable it
5. Add a Cache node to the canvas
6. Wait ~2 seconds -- the AI should automatically provide feedback about the new cache
7. Drag the cache node around -- no new AI analysis should trigger
8. Add an edge from Service to Cache -- after ~2 seconds, AI comments on the new connection
9. Toggle auto-analyze off -- further changes should not trigger AI responses

## Key Implementation Points

- Toggle is in the ChatPanel header, off by default
- Only structural changes trigger analysis (add/remove nodes, add/remove edges, protocol/property changes)
- Position/zoom/pan changes are ignored
- 2-second debounce batches rapid changes into a single analysis
- Manual chat messages cancel pending auto-triggers
- Auto-analyze messages show "(auto-analysis)" prefix
- Uses same turn limit and rate limiting as manual chat
