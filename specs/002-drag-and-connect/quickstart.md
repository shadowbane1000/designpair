# Quickstart: Drag and Connect

## Prerequisites

Same as Milestone 1 (Node.js v20+, Go 1.26+).

## Development

```bash
make dev
```

Open http://localhost:5173 in your browser.

## Usage

### Adding Components

1. The component palette is visible on the left side of the canvas
2. Drag any component (Service, Database, Cache, Queue, Load Balancer) onto the canvas
3. The component appears at the drop position with a default name
4. Double-click the name to edit it

### Connecting Components

1. Hover over a node to see connection handles
2. Drag from one node's handle to another node
3. A directed edge appears showing data flow direction
4. Click/double-click an edge to add or edit its label (e.g., "HTTP", "async")

### Deleting

- Select a node or edge and press Delete/Backspace to remove it
- Deleting a node also removes all its connected edges

### Viewing Graph State

- Press the debug toggle button (or keyboard shortcut) to open the debug panel
- The panel shows the current graph as JSON
- JSON updates live as you modify the diagram

## Testing

```bash
make lint
make test
```

Graph serialization tests verify the JSON contract against various graph configurations.
