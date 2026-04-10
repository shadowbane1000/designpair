import { Handle, Position, useReactFlow, type NodeProps, type Node } from '@xyflow/react'
import type { LucideIcon } from 'lucide-react'
import { StickyNote } from 'lucide-react'
import { type ArchitectureNodeData } from '../../types/graph'
import { useAnnotationClick } from './AnnotationContext'
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
  const onAnnotationClick = useAnnotationClick()
  const replicaCount = data.replicaCount ?? 1
  const hasAnnotation = !!data.annotation
  const pendingStatus = data.pendingStatus
  const isPending = pendingStatus && pendingStatus !== 'committed'
  const oldValues = data.pendingOldValues
  const nameChanged = pendingStatus === 'pendingModify' && oldValues?.name && oldValues.name !== data.label
  const oldReplicaCount = oldValues?.replicaCount ?? 1
  const replicaChanged = pendingStatus === 'pendingModify' && oldReplicaCount !== replicaCount

  const pendingClass =
    pendingStatus === 'pendingAdd' ? 'node-pending-add' :
    pendingStatus === 'pendingDelete' ? 'node-pending-delete' :
    pendingStatus === 'pendingModify' ? 'node-pending-modify' : ''

  return (
    <div className={`architecture-node ${className} ${pendingClass}`} data-testid={`node-${id}`}>
      {/* Dual handles at each position: source + target overlapping */}
      <Handle type="target" position={Position.Top} id="top-target" className="handle-overlay" />
      <Handle type="source" position={Position.Top} id="top-source" className="handle-overlay" />
      <Handle type="target" position={Position.Left} id="left-target" className="handle-overlay" />
      <Handle type="source" position={Position.Left} id="left-source" className="handle-overlay" />

      <div className="node-header">
        <Icon size={16} className="node-icon" />
        <span className="node-type-label">{typeLabel}</span>
        {replicaChanged ? (
          <span className="node-replica-badge" data-testid={`replica-count-${id}`}>
            <span className="node-old-value">×{oldReplicaCount}</span>
            {' '}
            <span className="node-new-value">×{replicaCount}</span>
          </span>
        ) : replicaCount > 1 ? (
          <span className="node-replica-badge" data-testid={`replica-count-${id}`}>×{replicaCount}</span>
        ) : null}
        {!isPending && (
          <span
            className={`node-annotation-badge nodrag nopan ${hasAnnotation ? 'has-annotation' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              onAnnotationClick?.(id, e)
            }}
            title={hasAnnotation ? 'Edit annotation' : 'Add annotation'}
            data-testid={`annotation-badge-${id}`}
          >
            <StickyNote size={12} />
          </span>
        )}
      </div>
      {nameChanged ? (
        <div className="node-name-input" data-testid={`node-name-${id}`}>
          <span className="node-old-value">{oldValues.name}</span>
          {' '}
          <span className="node-new-value">{data.label}</span>
        </div>
      ) : (
        <input
          className="node-name-input nodrag nopan"
          value={data.label}
          onChange={(e) => {
            updateNodeData(id, { label: e.target.value })
          }}
          readOnly={isPending}
          data-testid={`node-name-${id}`}
        />
      )}
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

      <Handle type="target" position={Position.Bottom} id="bottom-target" className="handle-overlay" />
      <Handle type="source" position={Position.Bottom} id="bottom-source" className="handle-overlay" />
      <Handle type="target" position={Position.Right} id="right-target" className="handle-overlay" />
      <Handle type="source" position={Position.Right} id="right-source" className="handle-overlay" />
    </div>
  )
}
