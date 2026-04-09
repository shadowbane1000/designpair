# Quickstart: Empty Canvas

## Prerequisites

- Node.js v20+
- Go 1.24+
- Docker (for building container images)

## Setup

```bash
# Clone the repository
git clone ssh://git@192.168.0.41:30009/tyler/designpair.git
cd designpair

# Install frontend dependencies
cd frontend && npm install && cd ..
```

## Development

```bash
# Start both frontend and backend
make dev
```

This starts:
- Frontend dev server at http://localhost:5173 (Vite, hot reload)
- Backend server at http://localhost:8081

Open http://localhost:5173 in your browser. You should see an empty interactive canvas that you can pan (click-drag) and zoom (scroll wheel).

## Verify Backend

```bash
curl http://localhost:8081/health
# Expected: {"status":"ok"}
```

## Lint & Test

```bash
# Run all checks
make lint
make test

# Individual targets
make frontend-lint
make frontend-test
make backend-lint
make backend-test
```

## Build Docker Images

```bash
make build-all
# Or individually:
make frontend-build
make backend-build
```

## CI

The Gitea Actions pipeline runs automatically on every push:
1. Lint (ESLint + golangci-lint)
2. Test (Vitest + go test)
3. Build (both Docker images)
