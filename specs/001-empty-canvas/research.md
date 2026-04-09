# Research: Empty Canvas

## Frontend Tooling

### Bootstrapping

- **Decision**: Use `npm create vite@latest frontend -- --template react-ts`
- **Rationale**: Standard approach, gives React 19 + TypeScript + Vite out of the box
- **Alternatives considered**: Create React App (deprecated), Next.js (overkill — no SSR needed)

### Dependency Versions

| Package | Version | Notes |
|---------|---------|-------|
| React | 19.1.x | Stable, widely adopted |
| @xyflow/react | 12.x | React Flow 12 under new `@xyflow` scope |
| Vite | 6.x | Stable since late 2024 |
| TypeScript | 5.7+ | Strict mode from the start |
| Vitest | 3.x | Vitest 3 released early 2025 |
| ESLint | 9.x | Flat config is the only format |

### React Flow 12 Notes

- Package moved from `reactflow` to `@xyflow/react` in v12
- Nodes/edges must be passed as directly controlled state
- `nodeTypes` and `edgeTypes` must be defined outside the component or memoized (React Flow warns at runtime otherwise)
- Custom node props need explicit typing via `NodeProps<YourNodeData>` — important with strict TS
- Use `Node<T>` and `Edge<T>` generic type parameters from the start

### ESLint 9 Flat Config

- Flat config (`eslint.config.js`) is the default; legacy `.eslintrc` removed
- Vite template scaffolds the config automatically
- Standard plugins: `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`

## Backend Tooling

### HTTP Server

- **Decision**: Use Go standard library `net/http` with method routing (Go 1.22+)
- **Rationale**: `mux.HandleFunc("GET /health", handler)` is sufficient. No third-party router needed for this scope.
- **Alternatives considered**: chi (unnecessary complexity for a health endpoint), gorilla/mux (archived)

### Health Check

- **Decision**: `GET /health` returning `200` with `{"status":"ok"}` JSON body
- **Rationale**: Simple, standard pattern. `/health` over `/healthz` (Kubernetes convention not needed yet)
- **Alternatives considered**: `/healthz` (defer to when K8s is relevant)

### golangci-lint v2

- **Decision**: Use golangci-lint v2.x with minimal config
- **Rationale**: v2 released 2025 with new config schema. Enable `govet`, `staticcheck`, `errcheck`, `gosimple`, `unused`
- **Alternatives considered**: v1 (EOL)

### Dockerfile

- **Decision**: Multi-stage build with `golang:1.24-alpine` builder and `gcr.io/distroless/static-debian12` runtime
- **Rationale**: CGO_ENABLED=0 pure Go build. Distroless preferred over scratch (includes CA certs, tzdata)
- **Alternatives considered**: scratch (missing CA certs), debian-slim (larger image)

### Testing

- **Decision**: `go test` with table-driven tests
- **Rationale**: Standard Go testing patterns. No external test framework needed.
- **Alternatives considered**: testify (unnecessary for this scope)

## Frontend Dockerfile

- **Decision**: Multi-stage build with `node:20-alpine` builder and `nginx:alpine` runtime
- **Rationale**: Vite produces static files; nginx serves them efficiently. Alpine for small image size.
- **Alternatives considered**: Serve via Vite preview (not production-grade), Node runtime (unnecessary for static files)
