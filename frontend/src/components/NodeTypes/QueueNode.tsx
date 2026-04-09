import type { NodeProps, Node } from '@xyflow/react'
import type { ArchitectureNodeData } from '../../types/graph'
import { BaseNode } from './BaseNode'

export function QueueNode(props: NodeProps<Node<ArchitectureNodeData>>) {
  return <BaseNode nodeProps={props} className="node-queue" typeLabel="Queue" />
}
