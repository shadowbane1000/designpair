.PHONY: dev frontend-dev backend-dev lint frontend-lint backend-lint test frontend-test backend-test build-all frontend-build backend-build e2e e2e-ui

# Development
dev:
	@echo "Starting frontend and backend..."
	@trap 'kill 0' EXIT; \
		$(MAKE) frontend-dev & \
		$(MAKE) backend-dev & \
		wait

frontend-dev:
	cd frontend && npm run dev

backend-dev:
	cd backend && go run ./cmd/designpair

# Lint
lint: frontend-lint backend-lint

frontend-lint:
	cd frontend && npx eslint .

backend-lint:
	cd backend && golangci-lint run ./...

# Test
test: frontend-test backend-test

frontend-test:
	cd frontend && npx vitest run

backend-test:
	cd backend && go test ./...

# Build
build-all: frontend-build backend-build

frontend-build:
	docker build -t designpair-frontend:latest -f frontend/Dockerfile .

backend-build:
	docker build -t designpair-backend:latest backend/

# E2E
e2e:
	cd frontend && npx playwright test

e2e-ui:
	cd frontend && npx playwright test --ui
