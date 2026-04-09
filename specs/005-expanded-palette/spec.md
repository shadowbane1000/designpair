# Feature Specification: Expanded Component Library + Scalability

**Feature Branch**: `005-expanded-palette`
**Created**: 2026-04-09
**Status**: Draft
**Input**: User description: "milestone 5"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Access the Full Component Library (Priority: P1)

A user opens the palette and sees all architecture component types organized by category. The categories are: Compute (Service, API Gateway, Load Balancer, Serverless Function), Data (Database SQL, Database NoSQL, Cache, Object Storage), Messaging (Message Queue, Event Bus, Stream Processor), Network (CDN, DNS, Firewall), and Clients (Web Client, Mobile Client, IoT Client, External API). Each component is visually distinguishable by an icon or category-specific styling.

**Why this priority**: The expanded library is the foundation of this milestone — without it, users can only build trivial diagrams with the original 5 types.

**Independent Test**: Open the palette. All 17 component types are visible, organized under 5 category headings. Drag one from each category onto the canvas. Each renders with distinct visual identity.

**Acceptance Scenarios**:

1. **Given** the palette is displayed, **When** the user views it, **Then** they see 18 component types organized under 5 category headings
2. **Given** a component in any category, **When** the user drags it onto the canvas, **Then** a node of that type appears with a category-appropriate visual style
3. **Given** multiple component types on the canvas, **When** the user views them, **Then** each type is visually distinguishable at a glance through icons or category-specific colors
4. **Given** a new component type (e.g., Event Bus), **When** the user drags it onto the canvas and asks the AI, **Then** the AI recognizes the component type and reasons about its architectural role

---

### User Story 2 - Indicate Service Scalability (Priority: P1)

A user wants to indicate that a component is horizontally scaled. They select a node and set a replica count (e.g., "×3"). The node displays the replica indicator visually. When the AI analyzes the architecture, it considers scaling in its assessment — for example, noting that a scaled service behind a load balancer is properly configured, or that a database with no replicas is a single point of failure for scaled services writing to it.

**Why this priority**: Equal priority with the expanded library — scalability is a fundamental architectural property that changes the AI's analysis significantly.

**Independent Test**: Place a Service on the canvas. Set its replica count to 3. The node shows "×3". Ask the AI — the response references the scaling configuration.

**Acceptance Scenarios**:

1. **Given** a node that supports scaling (e.g., Service, Database), **When** the user selects it, **Then** they can set a replica count (1 or more)
2. **Given** a node that is inherently scalable (e.g., Serverless Function, CDN), **When** the user selects it, **Then** no replica count setting is offered (the AI understands these scale automatically)
2. **Given** a node with replica count > 1, **When** the user views it, **Then** the node displays a visual replica indicator (e.g., "×3")
3. **Given** a node with replica count = 1 (default), **When** the user views it, **Then** no replica indicator is shown
4. **Given** a diagram with scaled components, **When** the AI analyzes the architecture, **Then** the response references scaling context (e.g., "3 replicas of the API service")
5. **Given** a scaled service writing to a single database, **When** the AI analyzes, **Then** it flags the potential write bottleneck

---

### User Story 3 - Browse Components by Category (Priority: P2)

A user wants to quickly find a component type. The palette groups components by category with collapsible sections. Each category has a distinct visual treatment (color, icon) that carries through to the nodes on the canvas.

**Why this priority**: With 17 components, organization becomes important for discoverability, but the expanded list is usable even without collapsible categories.

**Independent Test**: Open the palette. Click a category heading to collapse it. Click again to expand. Components within each category share a visual style that matches their nodes on the canvas.

**Acceptance Scenarios**:

1. **Given** the palette, **When** the user views it, **Then** components are grouped under category headings (Compute, Data, Messaging, Network, Clients)
2. **Given** a category heading, **When** the user clicks it, **Then** the category collapses/expands to show/hide its components
3. **Given** components in the same category, **When** the user views them on the canvas, **Then** they share a category color while remaining individually distinguishable

---

### Edge Cases

- What happens with the existing 5 component types from Phase 1? They continue to work — Service, Database (SQL), Cache, Queue, Load Balancer remain as they were, now organized under their respective categories.
- What happens when the user sets replica count to 0? Minimum replica count is 1 (cannot have zero instances).
- What happens when the user sets a very high replica count (e.g., 1000)? Display the number as-is. The AI can comment on unusually high replica counts.
- What happens to existing diagrams saved in the debug panel JSON? The 5 original types remain valid. New types extend the schema without breaking existing serialization.
- What happens when the palette gets too long for the screen? The palette should scroll, with category headers remaining accessible.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The palette MUST display 18 component types: Service, API Gateway, Load Balancer, Serverless Function, Database (SQL), Database (NoSQL), Cache, Object Storage, Message Queue, Event Bus, Stream Processor, CDN, DNS, Firewall, Web Client, Mobile Client, IoT Client, External API
- **FR-002**: Components MUST be organized under 5 category headings: Compute, Data, Messaging, Network, Clients
- **FR-003**: Each category MUST have a distinct visual treatment (color) that carries through to nodes on the canvas
- **FR-004**: Each component type MUST be visually distinguishable from other types within its category (via icon or shape variation)
- **FR-005**: Users MUST be able to set a replica count (integer ≥ 1) on node types where horizontal scaling is meaningful: Service, API Gateway, Database (SQL), Database (NoSQL), Cache, Object Storage, Stream Processor. Node types that are inherently scalable (Serverless Function, CDN) or not scalable in this way (Load Balancer, DNS, Firewall, Message Queue, Event Bus, Web Client, Mobile Client, IoT Client, External API) MUST NOT offer a replica count setting.
- **FR-006**: Nodes with replica count > 1 MUST display a visual indicator showing the count (e.g., "×3")
- **FR-007**: Nodes with replica count = 1 (default) MUST NOT display a replica indicator
- **FR-008**: The graph serialization MUST include the replica count for nodes that support it
- **FR-009**: The AI prompt construction MUST include scaling context (replica counts and inherent scalability properties) in its topology analysis
- **FR-010**: Category headings in the palette MUST be collapsible/expandable
- **FR-011**: The palette MUST scroll when the content exceeds the visible area
- **FR-012**: The existing 5 component types from Phase 1 MUST continue to function without modification to existing behavior

### Key Entities

- **ComponentType**: Extended from 5 to 17 types, each belonging to a category.
- **ComponentCategory**: One of Compute, Data, Messaging, Network, Clients. Defines visual grouping and color.
- **ReplicaCount**: An integer property (≥ 1, default 1) on each node indicating horizontal scaling.
- **Node (updated)**: Now includes `replicaCount` in addition to type, name, and position.
- **GraphState (updated)**: Serialized nodes now include `replicaCount` field.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 18 component types are available in the palette and can be placed on the canvas
- **SC-002**: A user can identify any component's category at a glance by its color on the canvas
- **SC-003**: A user can set and see replica counts on nodes within 2 interactions (click + type/increment)
- **SC-004**: The AI references scaling configuration in its analysis when replica counts > 1 are present
- **SC-005**: Existing diagrams (5 original types) continue to work without any user action

## Assumptions

- The 5 original component types map to the new expanded set: Service → Compute/Service, Database → Data/Database (SQL), Cache → Data/Cache, Queue → Messaging/Message Queue, Load Balancer → Network/Load Balancer
- Icons are simple SVG or emoji-style indicators — not full illustration-quality graphics
- Replica count is set via a small numeric input or +/- stepper on the node, not a modal or properties panel
- The default replica count is 1 for nodes that support it; inherently scalable types (Serverless Function, CDN) have no replica count — the AI knows they auto-scale
- Infrastructure types (Load Balancer, DNS, Firewall) and external types (Web Client, Mobile Client, IoT Client, External API) don't have replica counts — they serve different architectural roles
- Category colors are distinct from each other but consistent with the existing M2 color scheme where types overlap
- This milestone does not include deployment context containers (Kubernetes clusters, VPCs) — that's a future milestone
