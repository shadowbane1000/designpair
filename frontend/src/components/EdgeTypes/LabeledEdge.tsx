import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
  type Edge,
} from '@xyflow/react'
import type { ArchitectureEdgeData } from '../../types/graph'
import { protocolColors, protocolLabels } from '../../types/graph'
import './EdgeTypes.css'

export function LabeledEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
  markerStart,
}: EdgeProps<Edge<ArchitectureEdgeData>>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })

  const protocol = data?.protocol
  const syncAsync = data?.syncAsync ?? 'sync'
  const label = data?.label ?? ''
  const pendingStatus = data?.pendingStatus
  const pendingOldValues = data?.pendingOldValues

  const color = protocol ? (protocolColors[protocol] ?? '#9ca3af') : '#9ca3af'
  const displayLabel = protocol ? (protocolLabels[protocol] ?? label) : label
  const isDashed = syncAsync === 'async'

  // Pending visual overrides
  const strokeColor =
    pendingStatus === 'pendingAdd' ? '#22c55e' :
    pendingStatus === 'pendingDelete' ? '#ef4444' :
    pendingStatus === 'pendingModify' ? '#eab308' :
    color

  const pendingContainerClass =
    pendingStatus === 'pendingAdd' ? 'edge-pending-add' :
    pendingStatus === 'pendingDelete' ? 'edge-pending-delete' :
    pendingStatus === 'pendingModify' ? 'edge-pending-modify' : ''

  // Build label content for modify state (old -> new)
  const isModify = pendingStatus === 'pendingModify' && pendingOldValues
  const oldProtocolLabel = isModify && pendingOldValues.protocol
    ? (protocolLabels[pendingOldValues.protocol] ?? pendingOldValues.protocol)
    : null

  // Show label: for pending-delete with no protocol, show x
  const showDelete = pendingStatus === 'pendingDelete'
  const hasLabel = displayLabel || showDelete || isModify

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        markerStart={markerStart}
        style={{
          stroke: strokeColor,
          strokeWidth: 2,
          strokeDasharray: isDashed ? '6 3' : undefined,
          opacity: pendingStatus === 'pendingDelete' ? 0.5 : 1,
        }}
      />
      {hasLabel && (
        <EdgeLabelRenderer>
          <div
            className={`edge-label-container ${pendingContainerClass}`}
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${String(labelX)}px,${String(labelY)}px)`,
              pointerEvents: 'all',
            }}
            data-testid={`edge-${id}`}
          >
            {isModify && oldProtocolLabel ? (
              <span className="edge-protocol-label" style={{ borderColor: '#eab308' }} data-testid={`edge-label-${id}`}>
                <span className="edge-old-value">{oldProtocolLabel}</span>
                <span className="edge-arrow">&rarr;</span>
                <span className="edge-new-value">{displayLabel}</span>
              </span>
            ) : showDelete ? (
              <span className="edge-protocol-label" style={{ color: '#ef4444', borderColor: '#ef4444' }} data-testid={`edge-label-${id}`}>
                {displayLabel || '\u00d7'}
              </span>
            ) : (
              <span
                className="edge-protocol-label"
                style={{ color: strokeColor, borderColor: strokeColor }}
                data-testid={`edge-label-${id}`}
              >
                {displayLabel}
              </span>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
