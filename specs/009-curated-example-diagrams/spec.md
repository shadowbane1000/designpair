# Feature Specification: Curated Example Diagrams

**Feature Branch**: `009-curated-example-diagrams`
**Created**: 2026-04-09
**Status**: Draft
**Input**: Milestone 9 from phase2_milestones.md — pre-built sample architectures users can load with one click.

## User Scenarios & Testing

### User Story 1 - New User Loads an Example (Priority: P1)

A first-time visitor opens DesignPair with an empty canvas. They see example diagrams they can load. They click "E-commerce Microservices" and the canvas populates with 6-8 nodes and connections. The chat input auto-fills with a suggested question.

**Acceptance Scenarios**:

1. **Given** the canvas is empty, **When** the user clicks an example card, **Then** the canvas loads the example's nodes and edges, and the chat input fills with the example's suggested question.
2. **Given** an example is loaded, **When** the user clicks Send with the pre-filled question, **Then** the AI analyzes the loaded architecture.

### User Story 2 - User Loads Example Over Existing Work (Priority: P1)

A user has drawn components on the canvas. They want to load an example. The system warns them before replacing their work.

**Acceptance Scenarios**:

1. **Given** the canvas has nodes, **When** the user selects an example, **Then** a confirmation dialog appears before replacing.
2. **Given** the confirmation dialog appears, **When** the user cancels, **Then** the canvas is unchanged.
3. **Given** the confirmation dialog appears, **When** the user confirms, **Then** the canvas replaces with the example.

### User Story 3 - Example Selector Accessible from Header (Priority: P2)

The example selector is accessible from the header bar, so users can load examples at any time, not just on empty canvas.

**Acceptance Scenarios**:

1. **Given** any canvas state, **When** the user clicks the "Examples" button in the header, **Then** the example selector opens.

## Technical Design

### Example Data Format

Each example is a static JSON-compatible TypeScript object containing:
- `id`: unique string identifier
- `name`: display name
- `description`: short description
- `suggestedQuestion`: pre-filled chat input text
- `nodes`: array of `ArchitectureNode` definitions (with positions, types, labels)
- `edges`: array of `ArchitectureEdge` definitions (with protocols, directions)

### Examples to Include

1. **E-commerce Microservices** (~8 nodes): Web Client, API Gateway, Product Service, Order Service, Payment Service, SQL DB, NoSQL DB, Message Queue
2. **Real-time Chat** (~6 nodes): Web Client, Mobile Client, Load Balancer, Chat Service, Cache (Redis), NoSQL DB
3. **URL Shortener** (~5 nodes): Web Client, API Gateway, URL Service, Cache, SQL DB
4. **IoT Pipeline** (~7 nodes): IoT Client, MQTT Broker (Message Queue), Stream Processor, Event Bus, Service, NoSQL DB, Object Storage

### UI Design

- Header "Examples" dropdown button
- Empty canvas state shows example cards
- Card grid with name, description, node count
- Confirmation modal when canvas is non-empty

### Integration Points

- `useGraphState` hook's `setNodes`/`setEdges` to load example data
- `ChatPanel` needs to accept an external input value (for pre-filling suggested question)
- No backend changes needed
