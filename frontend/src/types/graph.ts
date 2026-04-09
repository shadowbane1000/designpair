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
  { type: 'messageQueue', label: 'Message Queue', category: 'messaging', icon: MessageSquare, supportsReplicas: false },
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
}

export interface ArchitectureEdgeData extends Record<string, unknown> {
  label: string
}

export type ArchitectureNode = Node<ArchitectureNodeData, ComponentType>
export type ArchitectureEdge = Edge<ArchitectureEdgeData>

export interface SerializedNode {
  id: string
  type: string
  name: string
  position: { x: number; y: number }
  replicaCount?: number
}

export interface SerializedEdge {
  id: string
  source: string
  target: string
  label: string
}

export interface GraphState {
  nodes: SerializedNode[]
  edges: SerializedEdge[]
}
