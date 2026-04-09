import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
  type EdgeProps,
  type Edge,
} from '@xyflow/react'
import type { ArchitectureEdgeData } from '../../types/graph'
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
}: EdgeProps<Edge<ArchitectureEdgeData>>) {
  const { updateEdgeData } = useReactFlow()
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} />
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
          <input
            className="edge-label-input nodrag nopan"
            value={data?.label ?? ''}
            onChange={(e) => {
              updateEdgeData(id, { label: e.target.value })
            }}
            placeholder="label"
            data-testid={`edge-label-${id}`}
          />
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
