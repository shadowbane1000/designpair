import { MarkerType } from '@xyflow/react'
import type {
  ArchitectureNode,
  ArchitectureEdge,
  ComponentType,
  EdgeProtocol,
  EdgeDirection,
  SyncAsync,
} from '../types/graph'

export interface ExampleDiagram {
  id: string
  name: string
  description: string
  suggestedQuestion: string
  nodes: ArchitectureNode[]
  edges: ArchitectureEdge[]
}

/** Helper to build a node with less boilerplate. */
function node(
  id: string,
  type: ComponentType,
  label: string,
  x: number,
  y: number,
  replicaCount?: number,
): ArchitectureNode {
  return {
    id,
    type,
    position: { x, y },
    data: { label, ...(replicaCount ? { replicaCount } : {}) },
  }
}

/** Helper to build an edge with less boilerplate. */
function edge(
  id: string,
  source: string,
  target: string,
  opts: {
    protocol?: EdgeProtocol
    label?: string
    direction?: EdgeDirection
    syncAsync?: SyncAsync
  } = {},
): ArchitectureEdge {
  const direction = opts.direction ?? 'oneWay'
  return {
    id,
    source,
    target,
    type: 'labeled',
    data: {
      label: opts.label ?? '',
      protocol: opts.protocol,
      direction,
      syncAsync: opts.syncAsync ?? (opts.protocol ? undefined : 'sync'),
    },
    markerEnd: { type: MarkerType.ArrowClosed },
    ...(direction === 'bidirectional'
      ? { markerStart: { type: MarkerType.ArrowClosed } }
      : {}),
  }
}

// ─── E-commerce Microservices ───────────────────────────────────────────────

const ecommerceNodes: ArchitectureNode[] = [
  node('ec-web', 'webClient', 'Web Client', 50, 0),
  node('ec-gw', 'apiGateway', 'API Gateway', 250, 100),
  node('ec-product', 'service', 'Product Service', 0, 250, 2),
  node('ec-order', 'service', 'Order Service', 250, 250),
  node('ec-payment', 'service', 'Payment Service', 500, 250),
  node('ec-db', 'databaseSql', 'Orders DB', 250, 420),
  node('ec-nosql', 'databaseNosql', 'Product Catalog', 0, 420),
  node('ec-queue', 'messageQueue', 'Order Events', 500, 420),
]

const ecommerceEdges: ArchitectureEdge[] = [
  edge('ec-e1', 'ec-web', 'ec-gw', { protocol: 'http', label: 'HTTP' }),
  edge('ec-e2', 'ec-gw', 'ec-product', { protocol: 'http', label: 'HTTP' }),
  edge('ec-e3', 'ec-gw', 'ec-order', { protocol: 'http', label: 'HTTP' }),
  edge('ec-e4', 'ec-gw', 'ec-payment', { protocol: 'http', label: 'HTTP' }),
  edge('ec-e5', 'ec-product', 'ec-nosql', { protocol: 'sql', label: 'SQL' }),
  edge('ec-e6', 'ec-order', 'ec-db', { protocol: 'sql', label: 'SQL' }),
  edge('ec-e7', 'ec-order', 'ec-queue', { protocol: 'async', label: 'async', syncAsync: 'async' }),
  edge('ec-e8', 'ec-payment', 'ec-queue', { protocol: 'async', label: 'async', syncAsync: 'async' }),
]

// ─── Real-time Chat ─────────────────────────────────────────────────────────

const chatNodes: ArchitectureNode[] = [
  node('ch-web', 'webClient', 'Web Client', 0, 0),
  node('ch-mobile', 'mobileClient', 'Mobile Client', 300, 0),
  node('ch-lb', 'loadBalancer', 'Load Balancer', 150, 120),
  node('ch-service', 'service', 'Chat Service', 150, 270, 3),
  node('ch-cache', 'cache', 'Session Cache', 0, 420),
  node('ch-db', 'databaseNosql', 'Messages DB', 300, 420),
]

const chatEdges: ArchitectureEdge[] = [
  edge('ch-e1', 'ch-web', 'ch-lb', { protocol: 'websocket', label: 'WebSocket', syncAsync: 'async' }),
  edge('ch-e2', 'ch-mobile', 'ch-lb', { protocol: 'websocket', label: 'WebSocket', syncAsync: 'async' }),
  edge('ch-e3', 'ch-lb', 'ch-service', { protocol: 'websocket', label: 'WebSocket', syncAsync: 'async' }),
  edge('ch-e4', 'ch-service', 'ch-cache', { protocol: 'tcp', label: 'TCP' }),
  edge('ch-e5', 'ch-service', 'ch-db', { protocol: 'tcp', label: 'TCP' }),
]

// ─── URL Shortener ──────────────────────────────────────────────────────────

const urlNodes: ArchitectureNode[] = [
  node('url-web', 'webClient', 'Web Client', 100, 0),
  node('url-gw', 'apiGateway', 'API Gateway', 100, 130),
  node('url-service', 'service', 'URL Service', 100, 270),
  node('url-cache', 'cache', 'URL Cache', 0, 420),
  node('url-db', 'databaseSql', 'URL Database', 250, 420),
]

const urlEdges: ArchitectureEdge[] = [
  edge('url-e1', 'url-web', 'url-gw', { protocol: 'http', label: 'HTTP' }),
  edge('url-e2', 'url-gw', 'url-service', { protocol: 'http', label: 'HTTP' }),
  edge('url-e3', 'url-service', 'url-cache', { protocol: 'tcp', label: 'TCP' }),
  edge('url-e4', 'url-service', 'url-db', { protocol: 'sql', label: 'SQL' }),
]

// ─── IoT Pipeline ───────────────────────────────────────────────────────────

const iotNodes: ArchitectureNode[] = [
  node('iot-device', 'iotClient', 'IoT Devices', 0, 0),
  node('iot-broker', 'messageQueue', 'MQTT Broker', 200, 0),
  node('iot-stream', 'streamProcessor', 'Stream Processor', 200, 150),
  node('iot-bus', 'eventBus', 'Event Bus', 200, 300),
  node('iot-service', 'service', 'Analytics Service', 0, 420),
  node('iot-db', 'databaseNosql', 'Time-Series DB', 200, 420),
  node('iot-storage', 'objectStorage', 'Raw Data Lake', 400, 420),
]

const iotEdges: ArchitectureEdge[] = [
  edge('iot-e1', 'iot-device', 'iot-broker', { protocol: 'mqtt', label: 'MQTT', syncAsync: 'async' }),
  edge('iot-e2', 'iot-broker', 'iot-stream', { protocol: 'async', label: 'async', syncAsync: 'async' }),
  edge('iot-e3', 'iot-stream', 'iot-bus', { protocol: 'pubsub', label: 'pub/sub', syncAsync: 'async' }),
  edge('iot-e4', 'iot-bus', 'iot-service', { protocol: 'pubsub', label: 'pub/sub', syncAsync: 'async' }),
  edge('iot-e5', 'iot-bus', 'iot-db', { protocol: 'async', label: 'async', syncAsync: 'async' }),
  edge('iot-e6', 'iot-stream', 'iot-storage', { protocol: 'async', label: 'async', syncAsync: 'async' }),
]

// ─── Export ─────────────────────────────────────────────────────────────────

export const exampleDiagrams: ExampleDiagram[] = [
  {
    id: 'ecommerce-microservices',
    name: 'E-commerce Microservices',
    description: 'Product, order, and payment services with async event processing',
    suggestedQuestion: 'How would you improve the scalability of this system?',
    nodes: ecommerceNodes,
    edges: ecommerceEdges,
  },
  {
    id: 'realtime-chat',
    name: 'Real-time Chat',
    description: 'WebSocket-based chat with session caching and message persistence',
    suggestedQuestion: 'What happens if the chat service goes down? How can we add fault tolerance?',
    nodes: chatNodes,
    edges: chatEdges,
  },
  {
    id: 'url-shortener',
    name: 'URL Shortener',
    description: 'Simple read-heavy service with caching layer',
    suggestedQuestion: 'This service gets 100x more reads than writes. What would you change?',
    nodes: urlNodes,
    edges: urlEdges,
  },
  {
    id: 'iot-pipeline',
    name: 'IoT Data Pipeline',
    description: 'Device telemetry ingestion with stream processing and analytics',
    suggestedQuestion: 'How would you handle a sudden 10x spike in IoT device connections?',
    nodes: iotNodes,
    edges: iotEdges,
  },
]
