import type { NodeTypes as ReactFlowNodeTypes, NodeProps, Node } from '@xyflow/react'
import { componentRegistry, categoryColors, type ArchitectureNodeData } from '../../types/graph'
import { BaseNode } from './BaseNode'

function createNodeComponent(entry: (typeof componentRegistry)[number]) {
  const categoryClass = `node-${entry.category}`

  function NodeComponent(props: NodeProps<Node<ArchitectureNodeData>>) {
    return (
      <BaseNode
        nodeProps={props}
        className={categoryClass}
        typeLabel={entry.label}
        icon={entry.icon}
        supportsReplicas={entry.supportsReplicas}
      />
    )
  }
  NodeComponent.displayName = `${entry.type}Node`
  return NodeComponent
}

export const nodeTypes: ReactFlowNodeTypes = Object.fromEntries(
  componentRegistry.map((entry) => [entry.type, createNodeComponent(entry)]),
)

export { categoryColors }
