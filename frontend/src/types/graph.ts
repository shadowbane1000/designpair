import type { Node, Edge } from '@xyflow/react'

export const ComponentTypes = {
  service: 'service',
  database: 'database',
  cache: 'cache',
  queue: 'queue',
  loadBalancer: 'loadBalancer',
} as const

export type ComponentType = (typeof ComponentTypes)[keyof typeof ComponentTypes]

export const componentTypeLabels: Record<ComponentType, string> = {
  service: 'Service',
  database: 'Database',
  cache: 'Cache',
  queue: 'Queue',
  loadBalancer: 'Load Balancer',
}

export interface ArchitectureNodeData extends Record<string, unknown> {
  label: string
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
