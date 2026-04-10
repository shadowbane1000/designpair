import { exampleDiagrams, type ExampleDiagram } from '../../data/examples'
import './ExampleSelector.css'

interface ExampleSelectorProps {
  onSelect: (example: ExampleDiagram) => void
  onClose: () => void
}

export function ExampleSelector({ onSelect, onClose }: ExampleSelectorProps) {
  return (
    <div className="example-overlay" data-testid="example-selector-overlay" onClick={onClose}>
      <div className="example-selector" data-testid="example-selector" onClick={(e) => { e.stopPropagation() }}>
        <div className="example-selector-header">
          <h3>Load Example Diagram</h3>
          <button className="example-close-btn" onClick={onClose} data-testid="example-close">&times;</button>
        </div>
        <div className="example-grid">
          {exampleDiagrams.map((example) => (
            <button
              key={example.id}
              className="example-card"
              onClick={() => { onSelect(example) }}
              data-testid={`example-card-${example.id}`}
            >
              <div className="example-card-name">{example.name}</div>
              <div className="example-card-desc">{example.description}</div>
              <div className="example-card-meta">
                {String(example.nodes.length)} nodes &middot; {String(example.edges.length)} connections
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
