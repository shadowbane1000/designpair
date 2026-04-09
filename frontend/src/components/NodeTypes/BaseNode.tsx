import { Handle, Position, useReactFlow, type NodeProps, type Node } from '@xyflow/react'
import { type ArchitectureNodeData } from '../../types/graph'
import './NodeTypes.css'

interface BaseNodeProps {
  nodeProps: NodeProps<Node<ArchitectureNodeData>>
  className: string
  typeLabel: string
}

export function BaseNode({ nodeProps, className, typeLabel }: BaseNodeProps) {
  const { id, data } = nodeProps
  const { updateNodeData } = useReactFlow()

  return (
    <div className={`architecture-node ${className}`} data-testid={`node-${id}`}>
      <Handle type="target" position={Position.Top} id="target-top" />
      <Handle type="target" position={Position.Left} id="target-left" />
      <div className="node-type-label">{typeLabel}</div>
      <input
        className="node-name-input nodrag nopan"
        value={data.label}
        onChange={(e) => {
          updateNodeData(id, { label: e.target.value })
        }}
        data-testid={`node-name-${id}`}
      />
      <Handle type="source" position={Position.Bottom} id="source-bottom" />
      <Handle type="source" position={Position.Right} id="source-right" />
    </div>
  )
}
