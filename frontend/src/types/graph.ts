import type { Node, Edge } from '@xyflow/react'
import type { LucideIcon } from 'lucide-react'
import {
  Server, Globe, ArrowLeftRight, Zap,
  Database, HardDrive, Archive,
  MessageSquare, Radio, Activity,
  Cloud, Globe2, Shield,
  Monitor, Smartphone, Cpu, ExternalLink,
} from 'lucide-react'

export const ComponentTypes = {
  service: 'service',
  apiGateway: 'apiGateway',
  loadBalancer: 'loadBalancer',
  serverlessFunction: 'serverlessFunction',
  databaseSql: 'databaseSql',
  databaseNosql: 'databaseNosql',
  cache: 'cache',
  objectStorage: 'objectStorage',
  messageQueue: 'messageQueue',
  eventBus: 'eventBus',
  streamProcessor: 'streamProcessor',
  cdn: 'cdn',
  dns: 'dns',
  firewall: 'firewall',
  webClient: 'webClient',
  mobileClient: 'mobileClient',
  iotClient: 'iotClient',
  externalApi: 'externalApi',
} as const

export type ComponentType = (typeof ComponentTypes)[keyof typeof ComponentTypes]

export const ComponentCategories = {
  compute: 'compute',
  data: 'data',
  messaging: 'messaging',
  network: 'network',
  clients: 'clients',
} as const

export type ComponentCategory = (typeof ComponentCategories)[keyof typeof ComponentCategories]

export const categoryLabels: Record<ComponentCategory, string> = {
  compute: 'Compute',
  data: 'Data',
  messaging: 'Messaging',
  network: 'Network',
  clients: 'Clients',
}

export const categoryColors: Record<ComponentCategory, string> = {
  compute: '#3b82f6',
  data: '#8b5cf6',
  messaging: '#10b981',
  network: '#ef4444',
  clients: '#f59e0b',
}

export interface ComponentRegistryEntry {
  type: ComponentType
  label: string
  category: ComponentCategory
  icon: LucideIcon
  supportsReplicas: boolean
}

export const componentRegistry: ComponentRegistryEntry[] = [
  // Compute
  { type: 'service', label: 'Service', category: 'compute', icon: Server, supportsReplicas: true },
  { type: 'apiGateway', label: 'API Gateway', category: 'compute', icon: Globe, supportsReplicas: true },
  { type: 'loadBalancer', label: 'Load Balancer', category: 'compute', icon: ArrowLeftRight, supportsReplicas: false },
  { type: 'serverlessFunction', label: 'Serverless Function', category: 'compute', icon: Zap, supportsReplicas: false },
  // Data
  { type: 'databaseSql', label: 'Database (SQL)', category: 'data', icon: Database, supportsReplicas: true },
  { type: 'databaseNosql', label: 'Database (NoSQL)', category: 'data', icon: Database, supportsReplicas: true },
  { type: 'cache', label: 'Cache', category: 'data', icon: HardDrive, supportsReplicas: true },
  { type: 'objectStorage', label: 'Object Storage', category: 'data', icon: Archive, supportsReplicas: true },
  // Messaging
  { type: 'messageQueue', label: 'Message Queue', category: 'messaging', icon: MessageSquare, supportsReplicas: true },
  { type: 'eventBus', label: 'Event Bus', category: 'messaging', icon: Radio, supportsReplicas: false },
  { type: 'streamProcessor', label: 'Stream Processor', category: 'messaging', icon: Activity, supportsReplicas: true },
  // Network
  { type: 'cdn', label: 'CDN', category: 'network', icon: Cloud, supportsReplicas: false },
  { type: 'dns', label: 'DNS', category: 'network', icon: Globe2, supportsReplicas: false },
  { type: 'firewall', label: 'Firewall', category: 'network', icon: Shield, supportsReplicas: false },
  // Clients
  { type: 'webClient', label: 'Web Client', category: 'clients', icon: Monitor, supportsReplicas: false },
  { type: 'mobileClient', label: 'Mobile Client', category: 'clients', icon: Smartphone, supportsReplicas: false },
  { type: 'iotClient', label: 'IoT Client', category: 'clients', icon: Cpu, supportsReplicas: false },
  { type: 'externalApi', label: 'External API', category: 'clients', icon: ExternalLink, supportsReplicas: false },
]

export const componentTypeLabels: Record<ComponentType, string> = Object.fromEntries(
  componentRegistry.map((e) => [e.type, e.label]),
) as Record<ComponentType, string>

const registryByType = new Map(componentRegistry.map((e) => [e.type, e]))
export function getRegistryEntry(type: ComponentType): ComponentRegistryEntry | undefined {
  return registryByType.get(type)
}

export interface ArchitectureNodeData extends Record<string, unknown> {
  label: string
  replicaCount?: number
  annotation?: string
  pendingStatus?: import('./suggestions').PendingStatus
  pendingOldValues?: { name?: string; replicaCount?: number }
}

// Edge protocol types
export const EdgeProtocols = {
  http: 'http',
  grpc: 'grpc',
  sql: 'sql',
  tcp: 'tcp',
  async: 'async',
  pubsub: 'pubsub',
  websocket: 'websocket',
  mqtt: 'mqtt',
  custom: 'custom',
} as const

export type EdgeProtocol = (typeof EdgeProtocols)[keyof typeof EdgeProtocols]

export const EdgeDirections = {
  oneWay: 'oneWay',
  bidirectional: 'bidirectional',
} as const

export type EdgeDirection = (typeof EdgeDirections)[keyof typeof EdgeDirections]

export type SyncAsync = 'sync' | 'async'

export interface ProtocolConfig {
  protocol: EdgeProtocol
  label: string
  defaultSyncAsync: SyncAsync
  color: string
}

export const protocolRegistry: ProtocolConfig[] = [
  { protocol: 'http', label: 'HTTP', defaultSyncAsync: 'sync', color: '#3b82f6' },
  { protocol: 'grpc', label: 'gRPC', defaultSyncAsync: 'sync', color: '#6366f1' },
  { protocol: 'sql', label: 'SQL', defaultSyncAsync: 'sync', color: '#8b5cf6' },
  { protocol: 'tcp', label: 'TCP', defaultSyncAsync: 'sync', color: '#64748b' },
  { protocol: 'async', label: 'async', defaultSyncAsync: 'async', color: '#10b981' },
  { protocol: 'pubsub', label: 'pub/sub', defaultSyncAsync: 'async', color: '#14b8a6' },
  { protocol: 'websocket', label: 'WebSocket', defaultSyncAsync: 'async', color: '#f59e0b' },
  { protocol: 'mqtt', label: 'MQTT', defaultSyncAsync: 'async', color: '#06b6d4' },
]

export const protocolColors: Record<string, string> = Object.fromEntries(
  protocolRegistry.map((p) => [p.protocol, p.color]),
)

export const protocolLabels: Record<string, string> = Object.fromEntries(
  protocolRegistry.map((p) => [p.protocol, p.label]),
)

export function getProtocolDefault(protocol: EdgeProtocol): SyncAsync {
  const entry = protocolRegistry.find((p) => p.protocol === protocol)
  return entry?.defaultSyncAsync ?? 'sync'
}

export interface ArchitectureEdgeData extends Record<string, unknown> {
  label: string
  protocol?: EdgeProtocol
  direction?: EdgeDirection
  syncAsync?: SyncAsync
  pendingStatus?: import('./suggestions').PendingStatus
  pendingOldValues?: { protocol?: string; direction?: string; syncAsync?: string }
  edgeOffset?: number
}

export type ArchitectureNode = Node<ArchitectureNodeData, ComponentType>
export type ArchitectureEdge = Edge<ArchitectureEdgeData>

export interface SerializedNode {
  id: string
  type: string
  name: string
  position: { x: number; y: number }
  replicaCount?: number
  annotation?: string
}

export interface SerializedEdge {
  id: string
  source: string
  target: string
  label: string
  protocol?: string
  direction?: string
  syncAsync?: string
}

export interface GraphState {
  nodes: SerializedNode[]
  edges: SerializedEdge[]
}

// Delta between two graph snapshots for auto-analyze
export interface DeltaNode {
  type: string
  name: string
}

export interface DeltaEdge {
  source: string
  target: string
  protocol?: string
}

export interface DeltaModify {
  name: string
  field: string
  oldValue: string
  newValue: string
}

export interface GraphDelta {
  addedNodes: DeltaNode[]
  removedNodes: DeltaNode[]
  addedEdges: DeltaEdge[]
  removedEdges: DeltaEdge[]
  modifiedNodes: DeltaModify[]
  modifiedEdges: DeltaModify[]
}
