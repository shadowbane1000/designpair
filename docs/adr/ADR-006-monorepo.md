# ADR-006: Monorepo with Separate Frontend and Backend Directories

**Status:** Accepted  
**Date:** 2026-04-08  
**Deciders:** Tyler Colbert

## Context

DesignPair has two distinct codebases: a TypeScript/React frontend and a Go backend. These need to coexist in a way that's easy for a reviewer to navigate, supports a single CI pipeline, and deploys cleanly via Docker Compose.

## Decision

Use a monorepo with top-level `frontend/` and `backend/` directories.

## Rationale

- **Single repo for reviewers:** A hiring manager clones one repo and sees the entire project. No cross-repo navigation, no "see also" links. The README, ADRs, CI config, and Docker Compose are all in one place.
- **Single CI pipeline:** One push triggers lint, test, and build for both frontend and backend. No cross-repo webhook coordination.
- **Docker Compose simplicity:** `docker-compose.yml` at the repo root references Dockerfiles in `frontend/` and `backend/`. Everything builds from one `docker-compose up`.
- **Shared documentation:** ADRs, architecture diagrams, and the README describe the full system. Splitting repos would fragment this.

## Alternatives Considered

- **Separate repos (polyrepo):** Standard for large teams where frontend and backend have different release cycles, different teams, and different deployment targets. Overkill for a single-developer portfolio project and fragments the reviewer experience.
- **Monorepo with a tool (Nx, Turborepo):** Adds tooling complexity without benefit at this scale. These tools shine with 5+ packages, not 2.

## Consequences

### Positive
- Single clone, single README, single CI pipeline
- Clean `docker-compose.yml` at the root
- Easy for reviewers to understand the full system
- ADRs describe the whole project, not just one half

### Negative
- Go and TypeScript tooling live side by side (different linters, different test runners, different dependency management)
- CI pipeline needs to handle both languages
- Git history mixes frontend and backend changes

### Mitigations
- CI has separate stages for frontend and backend (lint/test/build each independently)
- Makefile at the root with targets like `make frontend-lint`, `make backend-test`, `make build-all`
- Clear directory separation keeps concerns isolated despite sharing a repo
