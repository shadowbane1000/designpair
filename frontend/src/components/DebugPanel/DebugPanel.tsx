import { useState, useEffect, useCallback } from 'react'
import type { GraphState } from '../../types/graph'
import './DebugPanel.css'

interface DebugPanelProps {
  graphState: GraphState
}

export function DebugPanel({ graphState }: DebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false)

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === '`' && e.ctrlKey) {
        e.preventDefault()
        toggle()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => { window.removeEventListener('keydown', handleKeyDown) }
  }, [toggle])

  return (
    <>
      <button
        className="debug-toggle-button"
        onClick={toggle}
        data-testid="debug-toggle"
        title="Toggle debug panel (Ctrl+`)"
      >
        {isOpen ? '✕' : '{ }'}
      </button>
      {isOpen && (
        <aside className="debug-panel" data-testid="debug-panel">
          <h3 className="debug-panel-title">Graph State</h3>
          <pre className="debug-panel-json" data-testid="debug-panel-json">
            {JSON.stringify(graphState, null, 2)}
          </pre>
        </aside>
      )}
    </>
  )
}
