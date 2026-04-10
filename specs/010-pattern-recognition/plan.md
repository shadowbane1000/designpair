# Implementation Plan: Improved Pattern Recognition

**Branch**: `010-pattern-recognition` | **Date**: 2026-04-10 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/010-pattern-recognition/spec.md`

## Summary

Add a pattern detection layer to the existing topology analyzer that identifies 7 higher-level architectural patterns (CQRS, event sourcing, saga, fan-out, API gateway, microservices, monolith) from graph structure. Detected patterns are included in the prompt sent to the LLM so the AI can give pattern-aware feedback.

## Technical Context

**Language/Version**: Go 1.24 (backend only)
**Primary Dependencies**: None new — extends existing `internal/graph` package
**Storage**: N/A (no persistence)
**Testing**: Go table-driven tests (`go test`)
**Target Platform**: Linux server (Docker)
**Project Type**: Web service (backend component only)
**Performance Goals**: Pattern detection must complete in <1ms for graphs up to 50 nodes (simple graph traversal)
**Constraints**: No new dependencies. No frontend changes. Conservative detection to minimize false positives.
**Scale/Scope**: 7 pattern detectors, ~300-400 lines of Go code + tests

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Collaborator, Not Judge | PASS | Patterns are presented as observations, not scores. AI uses them for pattern-aware advice. |
| II. Graph Semantics Over Pixels | PASS | Pattern detection operates on node types and edge connectivity only, never positions. |
| III. Skateboard First | PASS | This is Phase 2 enhancement; walking skeleton is complete. No blocking dependencies. |
| IV. The Prompt Is the Product | PASS | This is exactly the kind of prompt enrichment this principle calls for — topology analysis beyond naive serialization. |
| V. ADRs Are the Meta-Play | PASS | Will document the pattern detection approach in an ADR. |

## Project Structure

### Documentation (this feature)

```text
specs/010-pattern-recognition/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── spec.md              # Feature specification
└── checklists/
    └── requirements.md  # Quality checklist
```

### Source Code (repository root)

```text
backend/
├── internal/
│   └── graph/
│       ├── analyzer.go       # Existing — add DetectedPatterns to TopologyAnalysis
│       ├── analyzer_test.go  # Existing — add pattern detection tests
│       ├── patterns.go       # NEW — pattern detection logic
│       ├── patterns_test.go  # NEW — table-driven pattern detection tests
│       ├── prompt.go         # Existing — add "Detected Patterns" section
│       └── prompt_test.go    # Existing — add pattern prompt tests
```

**Structure Decision**: All new code goes in the existing `backend/internal/graph` package. Pattern detection is a new file (`patterns.go`) but integrates into the existing `Analyze()` flow and `BuildPrompt()` output. No new packages needed.

## ADR Impact

| Existing ADR | Impact | Action |
|-------------|--------|--------|
| ADR-008 (Graph-to-Prompt Hybrid) | Extends the prompt format with a new "Detected Patterns" section | Compatible — enriches the existing hybrid approach |

## Complexity Tracking

No constitution violations. No complexity justification needed.
