import { useState } from 'react'
import {
  componentRegistry,
  ComponentCategories,
  categoryLabels,
  categoryColors,
  type ComponentType,
  type ComponentCategory,
} from '../../types/graph'
import './Palette.css'

const categories = Object.values(ComponentCategories) as ComponentCategory[]

function onDragStart(event: React.DragEvent, type: ComponentType) {
  event.dataTransfer.setData('application/reactflow', type)
  event.dataTransfer.effectAllowed = 'move'
}

export function Palette() {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const toggleCategory = (cat: ComponentCategory) => {
    setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }))
  }

  return (
    <aside className="palette">
      <h3 className="palette-title">Components</h3>
      {categories.map((cat) => {
        const entries = componentRegistry.filter((e) => e.category === cat)
        const isCollapsed = collapsed[cat] ?? false
        const color = categoryColors[cat]

        return (
          <div key={cat} className="palette-category">
            <button
              className="palette-category-header"
              onClick={() => { toggleCategory(cat) }}
              style={{ borderLeftColor: color }}
              data-testid={`category-${cat}`}
            >
              <span className="palette-category-label">{categoryLabels[cat]}</span>
              <span className="palette-category-chevron">{isCollapsed ? '+' : '−'}</span>
            </button>
            {!isCollapsed && (
              <div className="palette-category-items">
                {entries.map((entry) => {
                  const Icon = entry.icon
                  return (
                    <div
                      key={entry.type}
                      className="palette-item"
                      style={{ borderColor: color }}
                      draggable
                      onDragStart={(e) => { onDragStart(e, entry.type) }}
                      data-testid={`palette-${entry.type}`}
                    >
                      <Icon size={14} style={{ color, flexShrink: 0 }} />
                      <span>{entry.label}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </aside>
  )
}
