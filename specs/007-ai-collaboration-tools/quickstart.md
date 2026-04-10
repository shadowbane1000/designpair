# Quickstart: AI Collaboration Tools

## Development

```bash
export ANTHROPIC_API_KEY=sk-ant-...
make dev
```

## AI-Suggested Changes

### Ask the AI to modify your diagram

1. Build a diagram (e.g., Service → Database)
2. Type: "Add a cache between the service and the database"
3. The AI calls tools to suggest changes — green-glowing Cache node and edges appear, old edge shows red strikethrough
4. Click **Approve All** to commit, or **Discard All** to revert

### Multi-turn suggestions

1. Ask "add a cache" — suggestions appear
2. Without approving, ask "also add a load balancer in front of the service"
3. Both sets of suggestions accumulate
4. Approve All commits everything, or Discard All reverts everything

### Protocol suggestions

1. Build a diagram with connections
2. Type: "suggest protocols for all connections"
3. Edges show "old → new" labels (e.g., "→ HTTP", "→ async")
4. Approve to apply all protocol changes

## Visual Guide

| Visual | Meaning |
|--------|---------|
| Green glow | Pending addition |
| Red + strikethrough | Pending deletion |
| "old → new" label | Pending modification |
| Normal | Committed (approved) |

## Node Name Uniqueness

Node names must be unique. If you drag a second "Service" onto the canvas, it becomes "Service (2)". Renaming to an existing name is blocked.

## Testing

```bash
make lint && make test && make e2e
```
