# Research: Expanded Component Library + Scalability

## Icon Library

- **Decision**: Use `lucide-react` for component icons
- **Rationale**: Tree-shakeable (~200-300 bytes per icon), covers 15-16 of 18 types directly, consistent stroke-based style that scales cleanly to 16-20px, first-class React components with `size` and `color` props
- **Alternatives considered**: react-icons (poor tree-shaking, massive barrel exports), custom SVGs (maintenance burden for 18 icons), heroicons (fewer infrastructure icons)

### Icon Mapping

| Component Type | Lucide Icon | Notes |
|---------------|-------------|-------|
| Service | `Server` | |
| API Gateway | `Globe` | |
| Load Balancer | `ArrowLeftRight` | Traffic distribution |
| Serverless Function | `Zap` | Lightning bolt = event-driven |
| Database (SQL) | `Database` | |
| Database (NoSQL) | `Database` | Same icon, different label |
| Cache | `HardDrive` | Fast storage |
| Object Storage | `Archive` | Blob storage |
| Message Queue | `MessageSquare` | |
| Event Bus | `Radio` | Broadcast pattern |
| Stream Processor | `Activity` | Data stream |
| CDN | `Cloud` | Edge distribution |
| DNS | `Globe2` | Name resolution |
| Firewall | `Shield` | Security boundary |
| Web Client | `Monitor` | Browser |
| Mobile Client | `Smartphone` | |
| IoT Client | `Cpu` | Embedded device |
| External API | `ExternalLink` | Third-party integration |

## Node Registry Pattern

- **Decision**: Replace 5 individual node component files with a data-driven registry
- **Rationale**: 18 nearly-identical files is unmaintainable. A single `componentRegistry` array defines each type's config (type, label, icon, category, categoryColor, supportsReplicas) and `BaseNode` renders them all.
- **Alternatives considered**: Keep individual files (18 files, 90%+ duplication), single component with large switch statement (less clean than config-driven)

## Category Colors

- **Decision**: 5 distinct category colors, consistent with M2 where types overlap
- **Rationale**: Quick visual identification of component category at a glance

| Category | Color | Hex |
|----------|-------|-----|
| Compute | Blue | #3b82f6 |
| Data | Purple | #8b5cf6 |
| Messaging | Green | #10b981 |
| Network | Red | #ef4444 |
| Clients | Orange | #f59e0b |

## Scalability Annotation

- **Decision**: Small replica badge on nodes that support it, set via +/- stepper or direct input
- **Rationale**: Non-intrusive visual indicator. Only shown when replica count > 1. Integrated into existing BaseNode component.
- **Types supporting replicas**: Service, API Gateway, Database (SQL), Database (NoSQL), Cache, Object Storage, Stream Processor
- **Types excluded**: Serverless Function (inherently scalable), CDN (inherently distributed), Load Balancer, DNS, Firewall, Message Queue, Event Bus, Web/Mobile/IoT Client, External API

## Backend Prompt Changes

- **Decision**: Add replica count and inherent scalability to topology analysis
- **Rationale**: The AI needs to know "Service A ×3" to reason about scaling bottlenecks, load balancer necessity, database connection pooling, etc.
- **Format in prompt**: "Service A (×3 replicas)" in component list, "Scaled services: Service A (3 replicas)" in topology analysis
