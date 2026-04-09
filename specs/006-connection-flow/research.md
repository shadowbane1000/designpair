# Research: Connections and Flow Refinement

## Unified Handles

- **Decision**: Place both `type="source"` and `type="target"` handles at each position (top, bottom, left, right), overlapping visually as one handle. Use `connectionMode: 'loose'` on ReactFlow.
- **Rationale**: React Flow handles are inherently typed. The cleanest way to allow any-to-any connections is dual handles at each position. `connectionMode: 'loose'` allows connecting any source to any target regardless of position.
- **Alternatives considered**: Custom connection logic overriding React Flow internals (fragile, version-dependent), single handle type with custom validation (breaks React Flow's connection UX)

### Handle IDs

Each node gets 8 handles (was 4):
- `top-source`, `top-target`
- `bottom-source`, `bottom-target`
- `left-source`, `left-target`
- `right-source`, `right-target`

Styled to overlap at each position so they appear as 4 handles.

## Edge Context Menu

- **Decision**: Floating `<div>` portal positioned at click coordinates, not EdgeLabelRenderer
- **Rationale**: EdgeLabelRenderer is designed for simple inline labels. Complex menus need proper z-index control, click-outside-to-close, and space for dropdowns. A floating div gives all of this.
- **Pattern**: `onEdgeClick` on `<ReactFlow>` stores edge ID + screen position in state → render absolutely-positioned menu → click outside or select to close

## Protocol Colors

| Protocol | Color | Default Sync/Async | Line Style |
|----------|-------|-------------------|------------|
| HTTP | #3b82f6 (blue) | sync | solid |
| gRPC | #6366f1 (indigo) | sync | solid |
| SQL | #8b5cf6 (purple) | sync | solid |
| TCP | #64748b (slate) | sync | solid |
| async | #10b981 (green) | async | dashed |
| pub/sub | #14b8a6 (teal) | async | dashed |
| WebSocket | #f59e0b (amber) | async | dashed |
| MQTT | #06b6d4 (cyan) | async | dashed |
| custom | #9ca3af (gray) | sync (default) | solid |
| unlabeled | #9ca3af (gray) | sync (default) | solid |

## Bidirectional Arrows

- **Decision**: Use `markerStart` + `markerEnd` with `MarkerType.ArrowClosed` on the edge object
- **Rationale**: Built-in React Flow feature, no custom SVG needed. Both markers accept `color` prop for protocol-matching arrow colors.

## Dashed Lines

- **Decision**: Set `strokeDasharray: '6 3'` on the edge path for async connections
- **Rationale**: Standard SVG attribute, works in both custom edge component and via edge `style` prop. `6 3` gives a clean dash pattern visible at all zoom levels.

## Edge Reversal

- **Decision**: Swap `source`/`target` and `sourceHandle`/`targetHandle` via `setEdges`
- **Rationale**: Simple property swap, no edge recreation needed. Preserves edge ID and all other properties.

## Backend Prompt Updates

- **Decision**: Add protocol-aware sections to topology analysis
- **New analysis properties**:
  - `SyncChainDepth` — longest chain of synchronous connections from any entry point
  - `AsyncBoundaries` — edges where sync transitions to async (or vice versa)
  - `BidirectionalEdges` — edges with bidirectional flow (tight coupling indicator)
  - `ProtocolDistribution` — count by protocol type
- **Prompt format**: New "### Connection Analysis" section in the topology summary
