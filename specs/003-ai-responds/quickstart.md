# Quickstart: AI Responds

## Prerequisites

- Node.js v20+, Go 1.24+
- Anthropic API key (set as environment variable)

## Setup

```bash
# Set your Anthropic API key
export ANTHROPIC_API_KEY=sk-ant-...

# Start both services
make dev
```

Open http://localhost:5173 in your browser.

## Usage

### Build a Diagram

1. Drag components from the palette onto the canvas
2. Connect them by dragging between handles
3. Edit node names and edge labels

### Ask the AI

1. Verify the connection indicator shows "connected" (top of the page)
2. Click the "Ask AI" button
3. Watch the AI's response stream into the chat panel on the right
4. The AI will reference specific components and connections from your diagram

### Example Flow

1. Drag a Load Balancer, two Services, and a Database
2. Connect: LB → Service A, LB → Service B, Service A → DB, Service B → DB
3. Click "Ask AI"
4. The AI should identify the shared database as a potential bottleneck and suggest caching or read replicas

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | (required) | Anthropic API key for Claude |
| `CLAUDE_MODEL` | `claude-sonnet-4-5` | Claude model to use |
| `PORT` | `8081` | Backend HTTP/WebSocket port |

## Testing

```bash
make lint    # ESLint + golangci-lint
make test    # Vitest + go test (includes graph-to-prompt tests)
make e2e     # Playwright E2E tests
```

## Troubleshooting

- **"Disconnected" indicator**: Check that the backend is running (`make backend-dev`)
- **No AI response**: Verify `ANTHROPIC_API_KEY` is set in the environment where the backend runs
- **Slow first response**: The first request may take longer as the model warms up
