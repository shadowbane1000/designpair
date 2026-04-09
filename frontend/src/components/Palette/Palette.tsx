import { ComponentTypes, componentTypeLabels, type ComponentType } from '../../types/graph'
import './Palette.css'

const componentList = Object.values(ComponentTypes) as ComponentType[]

function onDragStart(event: React.DragEvent, type: ComponentType) {
  event.dataTransfer.setData('application/reactflow', type)
  event.dataTransfer.effectAllowed = 'move'
}

export function Palette() {
  return (
    <aside className="palette">
      <h3 className="palette-title">Components</h3>
      {componentList.map((type) => (
        <div
          key={type}
          className={`palette-item palette-item-${type}`}
          draggable
          onDragStart={(e) => { onDragStart(e, type) }}
          data-testid={`palette-${type}`}
        >
          {componentTypeLabels[type]}
        </div>
      ))}
    </aside>
  )
}
