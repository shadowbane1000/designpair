import { useEffect, useRef, useState } from 'react'
import {
  protocolRegistry,
  type EdgeProtocol,
  type EdgeDirection,
  type SyncAsync,
} from '../../types/graph'
import './EdgeContextMenu.css'

interface EdgeContextMenuProps {
  edgeId: string
  x: number
  y: number
  currentProtocol?: EdgeProtocol
  currentDirection: EdgeDirection
  currentSyncAsync: SyncAsync
  onSelectProtocol: (edgeId: string, protocol: EdgeProtocol, label: string, syncAsync?: SyncAsync) => void
  onToggleDirection: (edgeId: string) => void
  onReverse: (edgeId: string) => void
  onToggleSyncAsync: (edgeId: string) => void
  onClose: () => void
}

export function EdgeContextMenu({
  edgeId,
  x,
  y,
  currentProtocol,
  currentDirection,
  currentSyncAsync,
  onSelectProtocol,
  onToggleDirection,
  onReverse,
  onToggleSyncAsync,
  onClose,
}: EdgeContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [customText, setCustomText] = useState('')

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as HTMLElement)) {
        onClose()
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      className="edge-context-menu"
      style={{ left: x, top: y }}
      data-testid="edge-context-menu"
    >
      <div className="ecm-section">
        <div className="ecm-section-label">Protocol</div>
        <div className="ecm-protocols" data-testid="protocol-select">
          {protocolRegistry.map((p) => (
            <button
              key={p.protocol}
              className={`ecm-protocol-btn ${currentProtocol === p.protocol ? 'active' : ''}`}
              style={{ borderColor: p.color, color: currentProtocol === p.protocol ? '#fff' : p.color, background: currentProtocol === p.protocol ? p.color : 'transparent' }}
              onClick={() => { onSelectProtocol(edgeId, p.protocol, p.label) }}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="ecm-custom-row">
          <input
            className="ecm-custom-input"
            placeholder="Custom..."
            value={customText}
            onChange={(e) => { setCustomText(e.target.value) }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && customText.trim()) {
                onSelectProtocol(edgeId, 'custom', customText.trim())
                setCustomText('')
              }
            }}
          />
        </div>
      </div>

      <div className="ecm-section">
        <div className="ecm-section-label">Direction</div>
        <div className="ecm-actions">
          <button
            className={`ecm-action-btn ${currentDirection === 'bidirectional' ? 'active' : ''}`}
            onClick={() => { onToggleDirection(edgeId) }}
            data-testid="direction-toggle"
          >
            {currentDirection === 'oneWay' ? '→ One-way' : '↔ Bidirectional'}
          </button>
          <button
            className="ecm-action-btn"
            onClick={() => { onReverse(edgeId) }}
            data-testid="reverse-btn"
            disabled={currentDirection === 'bidirectional'}
          >
            ⇄ Reverse
          </button>
        </div>
      </div>

      <div className="ecm-section">
        <div className="ecm-section-label">Sync/Async</div>
        <button
          className={`ecm-action-btn ${currentSyncAsync === 'async' ? 'active' : ''}`}
          onClick={() => { onToggleSyncAsync(edgeId) }}
          data-testid="sync-async-toggle"
        >
          {currentSyncAsync === 'sync' ? '━ Sync (solid)' : '┅ Async (dashed)'}
        </button>
      </div>
    </div>
  )
}
