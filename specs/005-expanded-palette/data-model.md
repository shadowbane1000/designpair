# Data Model: Expanded Component Library + Scalability

## Overview

This milestone extends the component type system from 5 to 18 types, adds category grouping, and introduces a replica count property for scalability annotations.

## Updated Entities

### ComponentType (expanded enum)

| Type | Category | Supports Replicas | Icon |
|------|----------|-------------------|------|
| service | Compute | Yes | Server |
| apiGateway | Compute | Yes | Globe |
| loadBalancer | Compute | No | ArrowLeftRight |
| serverlessFunction | Compute | No (inherently scalable) | Zap |
| databaseSql | Data | Yes | Database |
| databaseNosql | Data | Yes | Database |
| cache | Data | Yes | HardDrive |
| objectStorage | Data | Yes | Archive |
| messageQueue | Messaging | No | MessageSquare |
| eventBus | Messaging | No | Radio |
| streamProcessor | Messaging | Yes | Activity |
| cdn | Network | No (inherently distributed) | Cloud |
| dns | Network | No | Globe2 |
| firewall | Network | No | Shield |
| webClient | Clients | No | Monitor |
| mobileClient | Clients | No | Smartphone |
| iotClient | Clients | No | Cpu |
| externalApi | Clients | No | ExternalLink |

### ComponentCategory

| Category | Color | Types |
|----------|-------|-------|
| Compute | #3b82f6 (Blue) | service, apiGateway, loadBalancer, serverlessFunction |
| Data | #8b5cf6 (Purple) | databaseSql, databaseNosql, cache, objectStorage |
| Messaging | #10b981 (Green) | messageQueue, eventBus, streamProcessor |
| Network | #ef4444 (Red) | cdn, dns, firewall |
| Clients | #f59e0b (Orange) | webClient, mobileClient, iotClient, externalApi |

### ArchitectureNodeData (updated)

| Field | Type | Description |
|-------|------|-------------|
| label | string | User-editable display name |
| replicaCount | number \| undefined | Replica count (only for types that support it, default 1) |

### SerializedNode (updated)

| Field | Type | Description |
|-------|------|-------------|
| id | string | UUID |
| type | string | One of 18 ComponentType values |
| name | string | User-editable display name |
| position | { x, y } | Canvas position |
| replicaCount | number \| undefined | Included only when > 1 and type supports replicas |

### ComponentRegistryEntry (new — frontend only)

Configuration for each component type, used by BaseNode and Palette.

| Field | Type | Description |
|-------|------|-------------|
| type | ComponentType | Enum value |
| label | string | Display name (e.g., "API Gateway") |
| category | ComponentCategory | Which category this belongs to |
| icon | LucideIcon | Icon component from lucide-react |
| supportsReplicas | boolean | Whether replica count is configurable |

## Backwards Compatibility

- Existing 5 types map to the expanded set:
  - `service` → Compute/Service (unchanged)
  - `database` → Data/Database (SQL) (type value preserved)
  - `cache` → Data/Cache (unchanged)
  - `queue` → Messaging/Message Queue (type value preserved)
  - `loadBalancer` → Network/Load Balancer (unchanged)
- Nodes with no `replicaCount` default to 1 (no visual indicator)
