# Data Model: Empty Canvas

## Overview

This milestone has no persistent data. The canvas state exists only in React component state (in-memory). This section documents the minimal data structures needed for the empty canvas.

## Entities

### Canvas State

The React Flow canvas maintains internal state for viewport position and zoom level. No custom entities are defined in this milestone.

| Field | Type | Description |
|-------|------|-------------|
| viewport.x | number | Pan offset X |
| viewport.y | number | Pan offset Y |
| viewport.zoom | number | Zoom level (default: 1) |
| nodes | Node[] | Empty array in this milestone |
| edges | Edge[] | Empty array in this milestone |

### Health Response

The backend health check returns a simple JSON object.

| Field | Type | Description |
|-------|------|-------------|
| status | string | Always "ok" when server is healthy |

## Relationships

None. No entities interact in this milestone.

## State Transitions

None. No lifecycle or state machine logic in this milestone.

## Future Considerations

In Milestone 2, nodes and edges will be populated with typed architecture components. The `Node<T>` and `Edge<T>` generic type parameters from React Flow will carry component-specific data (type, name, annotations). The data model will expand significantly.
