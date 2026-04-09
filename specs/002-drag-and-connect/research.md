# Research: Drag and Connect

## Custom Node Types

- **Decision**: Define custom node components per type (ServiceNode, DatabaseNode, etc.) with `NodeProps<Node<T>>` generics
- **Rationale**: Full TypeScript safety on `data` prop; each type gets its own visual treatment
- **Alternatives considered**: Single generic node component with type-based rendering (less type safety, harder to extend)

### Key Pattern
- `nodeTypes` object MUST be defined outside the component (or memoized) — React Flow warns and re-registers on every render otherwise
- Use `Node<TData, TType>` generic for typed node data
- Central registry in `NodeTypes/index.ts` exports the `nodeTypes` record

## Drag-and-Drop from Palette

- **Decision**: HTML5 native drag-and-drop with `dataTransfer.setData('application/reactflow', type)` on palette items, `onDrop` handler on canvas using `screenToFlowPosition`
- **Rationale**: Standard React Flow pattern; `screenToFlowPosition` (v12 API) correctly handles zoom/pan coordinate conversion
- **Alternatives considered**: React DnD library (unnecessary dependency), custom mouse event tracking (reinventing the wheel)

### Key Pattern
- Palette items set `draggable` and write component type to `dataTransfer`
- Canvas `onDrop` reads type, converts screen coordinates via `screenToFlowPosition()` from `useReactFlow()`, creates new node with `crypto.randomUUID()` ID

## Edge Labels

- **Decision**: Custom edge component using `EdgeLabelRenderer` with an HTML input for editable labels
- **Rationale**: `EdgeLabelRenderer` portals content above the SVG layer, enabling full HTML/React controls. Static `label` prop is insufficient for editable labels.
- **Alternatives considered**: Static edge `label` prop (not editable), custom SVG foreignObject (inconsistent browser support)

### Key Pattern
- Custom edge uses `getBezierPath` for path calculation, `BaseEdge` for rendering, `EdgeLabelRenderer` for the label overlay
- Label positioned at `(labelX, labelY)` with CSS `transform: translate(-50%, -50%)`
- `pointerEvents: 'all'` required on the label container for interactivity

## Connection Validation

- **Decision**: Use `isValidConnection` callback on `<ReactFlow>` to prevent self-connections
- **Rationale**: Built-in React Flow API; greys out invalid handles during drag, providing visual feedback
- **Alternatives considered**: Post-connection `onConnect` filter (worse UX — connection appears then disappears)

## Inline Node Editing

- **Decision**: Controlled `<input>` inside custom nodes with `nodrag nopan` CSS classes, using `updateNodeData(id, { label: value })` from `useReactFlow()`
- **Rationale**: Built-in React Flow class names prevent drag/pan conflicts; `updateNodeData` is the v12 API for mutating node data
- **Alternatives considered**: `contentEditable` (harder to control, accessibility concerns), double-click modal (interrupts flow)

## Graph Serialization

- **Decision**: Separate `graphSerializer.ts` service that transforms React Flow node/edge arrays into a clean JSON structure
- **Rationale**: Decoupling serialization from React Flow internals makes it testable and prepares for the graph-to-prompt logic in Milestone 3
- **Alternatives considered**: Direct JSON.stringify of React Flow state (includes internal fields, position data mixed with semantic data)
