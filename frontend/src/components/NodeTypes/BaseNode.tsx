import { Handle, Position, useReactFlow, type NodeProps, type Node } from '@xyflow/react'
import type { LucideIcon } from 'lucide-react'
import { type ArchitectureNodeData } from '../../types/graph'
import './NodeTypes.css'

interface BaseNodeProps {
  nodeProps: NodeProps<Node<ArchitectureNodeData>>
  className: string
  typeLabel: string
  icon: LucideIcon
  supportsReplicas: boolean
}

export function BaseNode({ nodeProps, className, typeLabel, icon: Icon, supportsReplicas }: BaseNodeProps) {
  const { id, data } = nodeProps
  const { updateNodeData } = useReactFlow()
  const replicaCount = data.replicaCount ?? 1

  return (
    <div className={`architecture-node ${className}`} data-testid={`node-${id}`}>
      <Handle type="target" position={Position.Top} id="target-top" />
      <Handle type="target" position={Position.Left} id="target-left" />
      <div className="node-header">
        <Icon size={16} className="node-icon" />
        <span className="node-type-label">{typeLabel}</span>
        {replicaCount > 1 && (
          <span className="node-replica-badge" data-testid={`replica-count-${id}`}>×{replicaCount}</span>
        )}
      </div>
      <input
        className="node-name-input nodrag nopan"
        value={data.label}
        onChange={(e) => {
          updateNodeData(id, { label: e.target.value })
        }}
        data-testid={`node-name-${id}`}
      />
      {supportsReplicas && (
        <div className="node-replica-control">
          <button
            className="replica-btn nodrag nopan"
            onClick={() => {
              if (replicaCount > 1) updateNodeData(id, { replicaCount: replicaCount - 1 })
            }}
            disabled={replicaCount <= 1}
          >
            −
          </button>
          <input
            className="replica-input nodrag nopan"
            type="number"
            min={1}
            value={replicaCount}
            onChange={(e) => {
              const val = Math.max(1, parseInt(e.target.value, 10) || 1)
              updateNodeData(id, { replicaCount: val })
            }}
            data-testid={`replica-input-${id}`}
          />
          <button
            className="replica-btn nodrag nopan"
            onClick={() => {
              updateNodeData(id, { replicaCount: replicaCount + 1 })
            }}
          >
            +
          </button>
        </div>
      )}
      <Handle type="source" position={Position.Bottom} id="source-bottom" />
      <Handle type="source" position={Position.Right} id="source-right" />
    </div>
  )
}
