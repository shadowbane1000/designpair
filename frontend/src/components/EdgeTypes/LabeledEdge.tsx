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

  const color = protocol ? (protocolColors[protocol] ?? '#9ca3af') : '#9ca3af'
  const displayLabel = protocol ? (protocolLabels[protocol] ?? label) : label
  const isDashed = syncAsync === 'async'

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        markerStart={markerStart}
        style={{
          stroke: color,
          strokeWidth: 2,
          strokeDasharray: isDashed ? '6 3' : undefined,
        }}
      />
      {displayLabel && (
        <EdgeLabelRenderer>
          <div
            className="edge-label-container"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${String(labelX)}px,${String(labelY)}px)`,
              pointerEvents: 'all',
            }}
            data-testid={`edge-${id}`}
          >
            <span
              className="edge-protocol-label"
              style={{ color, borderColor: color }}
              data-testid={`edge-label-${id}`}
            >
              {displayLabel}
            </span>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
