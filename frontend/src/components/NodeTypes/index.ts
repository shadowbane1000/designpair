import type { NodeTypes } from '@xyflow/react'
import { ServiceNode } from './ServiceNode'
import { DatabaseNode } from './DatabaseNode'
import { CacheNode } from './CacheNode'
import { QueueNode } from './QueueNode'
import { LoadBalancerNode } from './LoadBalancerNode'

export const nodeTypes: NodeTypes = {
  service: ServiceNode,
  database: DatabaseNode,
  cache: CacheNode,
  queue: QueueNode,
  loadBalancer: LoadBalancerNode,
}
