# Data Model: Improved Pattern Recognition

## Entities

### DetectedPattern

A recognized architectural pattern found in the graph topology.

| Field | Type | Description |
|-------|------|-------------|
| Name | string | Pattern identifier (e.g., "CQRS", "Microservices", "Saga") |
| Description | string | Human-readable description of what was detected |
| Evidence | []string | List of structural evidence (e.g., "Write Service -> Primary DB", "Read Service -> Cache") |

### TopologyAnalysis (extended)

The existing TopologyAnalysis struct gains one new field:

| Field | Type | Description |
|-------|------|-------------|
| DetectedPatterns | []DetectedPattern | Patterns identified in the graph topology |

## Relationships

- `TopologyAnalysis` contains 0..N `DetectedPattern` entries
- Each `DetectedPattern` references node names and edge descriptions from the graph (by name, not by ID)
- Pattern detection reads from `GraphState` and the already-computed fields of `TopologyAnalysis` (fan-in, fan-out, entry points, etc.)

## No New External Entities

Pattern detection is purely internal computation. No new API contracts, WebSocket messages, or frontend state changes are needed.
