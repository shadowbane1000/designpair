import { useCallback, useEffect, useRef } from 'react'
import './AnnotationPanel.css'

interface AnnotationPanelProps {
  nodeId: string
  nodeName: string
  annotation: string
  x: number
  y: number
  onUpdate: (nodeId: string, annotation: string) => void
  onClose: () => void
}

export function AnnotationPanel({ nodeId, nodeName, annotation, x, y, onUpdate, onClose }: AnnotationPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onUpdate(nodeId, e.target.value)
    },
    [nodeId, onUpdate],
  )

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    // Delay listener to avoid immediately closing on the click that opened it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  // Position the panel near the node, adjusting if it would go off screen
  const style: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(x + 10, window.innerWidth - 320),
    top: Math.min(y + 10, window.innerHeight - 220),
    zIndex: 1000,
  }

  return (
    <div ref={panelRef} className="annotation-panel" style={style} data-testid="annotation-panel">
      <div className="annotation-header">
        <span className="annotation-title">{nodeName}</span>
        <button className="annotation-close" onClick={onClose} data-testid="annotation-close">&times;</button>
      </div>
      <textarea
        ref={textareaRef}
        className="annotation-textarea"
        value={annotation}
        onChange={handleChange}
        placeholder="Add notes about this component..."
        rows={4}
        data-testid="annotation-input"
      />
    </div>
  )
}
