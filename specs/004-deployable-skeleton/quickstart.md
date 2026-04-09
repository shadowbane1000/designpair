# Quickstart: Deployable Skeleton

## Prerequisites

- Node.js v20+, Go 1.24+, Docker
- Anthropic API key

## Local Development

```bash
export ANTHROPIC_API_KEY=sk-ant-...
make dev
```

Open http://localhost:5173. Build a diagram, type a question in the chat input (or press Enter with empty input for a default analysis), and have a multi-turn conversation with the AI.

## Production Deployment

The application is live at https://designpair.colberts.us

### Manual Deploy (if needed)

```bash
# On the server
cd ~/designpair
docker compose up -d
```

### CI Auto-Deploy

Merging to main triggers automatic deployment via Gitea Actions:
1. Lint + test + build
2. Build Docker images (frontend + backend)
3. Upload and deploy to server
4. Health check verification

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | (required) | Anthropic API key |
| `CLAUDE_MODEL` | `claude-sonnet-4-5` | Claude model |
| `PORT` | `8081` | Backend port (internal) |

## Testing

```bash
make lint    # ESLint + golangci-lint
make test    # Vitest + go test
make e2e     # Playwright (requires ANTHROPIC_API_KEY)
```
