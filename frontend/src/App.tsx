import { useCallback, useEffect, useRef, useState } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { Canvas } from './components/Canvas/Canvas'
import { Palette } from './components/Palette/Palette'
import { DebugPanel } from './components/DebugPanel/DebugPanel'
import { ChatPanel, type ChatMessage } from './components/ChatPanel/ChatPanel'
import { ConnectionStatus } from './components/ConnectionStatus/ConnectionStatus'
import { EdgeContextMenu } from './components/EdgeContextMenu/EdgeContextMenu'
import { ExampleSelector } from './components/ExampleSelector/ExampleSelector'
import { AnnotationPanel } from './components/AnnotationPanel/AnnotationPanel'
import { AnnotationProvider } from './components/NodeTypes/AnnotationContext'
import { useGraphState } from './hooks/useGraphState'
import { useSuggestions } from './hooks/useSuggestions'
import { useWebSocket } from './hooks/useWebSocket'
import { useAutoAnalyze } from './hooks/useAutoAnalyze'
import { exportDiagram, parseDiagramFile } from './services/diagramIO'
import { exportMermaid } from './services/mermaidExport'
import { exportDrawio } from './services/drawioExport'
import type { WSMessage, ValidationErrorPayload } from './types/websocket'
import type { ExampleDiagram } from './data/examples'
import './App.css'

const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')
const WS_URL = `${wsProtocol}//${window.location.host}${basePath}/ws`

function AppContent() {
  const graphState = useGraphState()

  // Refs to always have current committed nodes/edges for suggestion processing
  const nodesRef = useRef(graphState.nodes)
  const edgesRef = useRef(graphState.edges)
  useEffect(() => { nodesRef.current = graphState.nodes }, [graphState.nodes])
  useEffect(() => { edgesRef.current = graphState.edges }, [graphState.edges])

  const { addSuggestion, hasPending, approveAll, discardAll, suggestions } =
    useSuggestions(graphState.setNodes, graphState.setEdges, nodesRef, edgesRef)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [turnsRemaining, setTurnsRemaining] = useState<number | null>(null)
  const [edgeMenu, setEdgeMenu] = useState<{ edgeId: string; x: number; y: number } | null>(null)
  const [showExamples, setShowExamples] = useState(false)
  const [pendingExample, setPendingExample] = useState<ExampleDiagram | null>(null)
  const [chatInput, setChatInput] = useState('')
  const [annotationPanel, setAnnotationPanel] = useState<{ nodeId: string; x: number; y: number } | null>(null)
  const [paletteOpen, setPaletteOpen] = useState(true)
  const [pendingClear, setPendingClear] = useState(false)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const sendRef = useRef<((data: unknown) => void) | null>(null)

  // Annotation panel: auto-close if the target node no longer exists
  const annotationNodeExists = annotationPanel ? graphState.nodes.some((n) => n.id === annotationPanel.nodeId) : false
  const activeAnnotationPanel = annotationPanel && annotationNodeExists ? annotationPanel : null

  const handleAnnotationClick = useCallback((nodeId: string, event: React.MouseEvent) => {
    const node = graphState.nodes.find((n) => n.id === nodeId)
    if (!node) return
    const pendingStatus = node.data.pendingStatus
    if (pendingStatus && pendingStatus !== 'committed') return
    setAnnotationPanel({ nodeId, x: event.clientX, y: event.clientY })
  }, [graphState.nodes])

  const handleAnnotationUpdate = useCallback((nodeId: string, annotation: string) => {
    graphState.updateNodeData(nodeId, { annotation })
  }, [graphState])

  const handleEdgeClick = useCallback((_event: React.MouseEvent, edge: { id: string; data?: Record<string, unknown> }) => {
    const pendingStatus = edge.data?.pendingStatus as string | undefined
    if (pendingStatus && pendingStatus !== 'committed') return
    setEdgeMenu({ edgeId: edge.id, x: _event.clientX, y: _event.clientY })
  }, [])

  const handlePaneClick = useCallback(() => {
    setEdgeMenu(null)
    setAnnotationPanel(null)
  }, [])

  const resetChat = useCallback(() => {
    setMessages([])
    setTurnsRemaining(null)
    discardAll()
    if (sendRef.current) {
      sendRef.current({ type: 'reset_conversation' })
    }
  }, [discardAll])

  // Close export menu on click-away
  useEffect(() => {
    if (!exportMenuOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as HTMLElement)) {
        setExportMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => { document.removeEventListener('mousedown', handleClickOutside) }
  }, [exportMenuOpen])

  const handleExportJSON = useCallback(() => {
    exportDiagram(graphState.nodes, graphState.edges)
    setExportMenuOpen(false)
  }, [graphState.nodes, graphState.edges])

  const handleExportMermaid = useCallback(() => {
    exportMermaid(graphState.nodes, graphState.edges)
    setExportMenuOpen(false)
  }, [graphState.nodes, graphState.edges])

  const handleExportDrawio = useCallback(() => {
    exportDrawio(graphState.nodes, graphState.edges)
    setExportMenuOpen(false)
  }, [graphState.nodes, graphState.edges])

  const handleImport = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = parseDiagramFile(reader.result as string)
      if (result) {
        graphState.loadExample(result.nodes, result.edges)
        resetChat()
      }
    }
    reader.readAsText(file)
    // Reset so the same file can be re-imported
    e.target.value = ''
  }, [graphState, resetChat])
  const canvasHasContent = graphState.nodes.length > 0

  const handleExampleSelect = useCallback((example: ExampleDiagram) => {
    if (canvasHasContent) {
      setPendingExample(example)
      setShowExamples(false)
    } else {
      graphState.loadExample(example.nodes, example.edges)
      resetChat()
      setChatInput(example.suggestedQuestion)
      setShowExamples(false)
    }
  }, [canvasHasContent, graphState, resetChat])

  const handleConfirmExample = useCallback(() => {
    if (!pendingExample) return
    graphState.loadExample(pendingExample.nodes, pendingExample.edges)
    resetChat()
    setChatInput(pendingExample.suggestedQuestion)
    setPendingExample(null)
  }, [pendingExample, graphState, resetChat])

  const handleCancelExample = useCallback(() => {
    setPendingExample(null)
  }, [])

  const handleClearCanvas = useCallback(() => {
    setPendingClear(true)
  }, [])

  const handleConfirmClear = useCallback(() => {
    graphState.setNodes([])
    graphState.setEdges([])
    resetChat()
    setPendingClear(false)
  }, [graphState, resetChat])

  const handleCancelClear = useCallback(() => {
    setPendingClear(false)
  }, [])

  const streamBufferRef = useRef('')
  const rafRef = useRef<number | null>(null)
  const currentMessageIdRef = useRef<string | null>(null)

  const flushBuffer = useCallback(() => {
    const buffer = streamBufferRef.current
    if (!buffer || !currentMessageIdRef.current) return
    streamBufferRef.current = ''

    const msgId = currentMessageIdRef.current
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId ? { ...m, content: m.content + buffer } : m,
      ),
    )
    rafRef.current = null
  }, [])

  const onMessage = useCallback(
    (data: unknown) => {
      const msg = data as WSMessage
      switch (msg.type) {
        case 'ai_chunk': {
          const payload = msg.payload as { delta: string }
          streamBufferRef.current += payload.delta
          if (rafRef.current === null) {
            rafRef.current = requestAnimationFrame(flushBuffer)
          }
          break
        }
        case 'ai_done': {
          if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current)
            rafRef.current = null
          }
          flushBuffer()
          setIsStreaming(false)
          const donePayload = msg.payload as { requestId: string; turnsRemaining?: number; isAutoAnalysis?: boolean }
          if (donePayload.turnsRemaining != null) {
            setTurnsRemaining(donePayload.turnsRemaining)
          }
          const doneId = currentMessageIdRef.current
          if (doneId) {
            const isAuto = donePayload.isAutoAnalysis === true
            setMessages((prev) =>
              prev.map((m) =>
                m.id === doneId ? { ...m, status: 'complete' as const, isAutoAnalysis: isAuto || m.isAutoAnalysis } : m,
              ),
            )
          }
          currentMessageIdRef.current = null
          break
        }
        case 'suggestion': {
          const payload = msg.payload as {
            tool: string
            params: Record<string, unknown>
            result: string
            error?: string
          }
          if (payload.result === 'success') {
            addSuggestion(payload.tool, payload.params)
          } else {
            const errorText = payload.error ?? `Tool ${payload.tool} failed`
            setMessages((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: `Tool error: ${errorText}`,
                status: 'error',
                timestamp: Date.now(),
              },
            ])
          }
          break
        }
        case 'error': {
          const errorPayload = msg.payload as { message: string }
          setIsStreaming(false)
          const errId = currentMessageIdRef.current
          if (errId) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === errId
                  ? { ...m, content: m.content || errorPayload.message, status: 'error' as const }
                  : m,
              ),
            )
          } else {
            setMessages((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: errorPayload.message,
                status: 'error',
                timestamp: Date.now(),
              },
            ])
          }
          currentMessageIdRef.current = null
          break
        }
        case 'validation_error': {
          const valPayload = msg.payload as ValidationErrorPayload
          setIsStreaming(false)
          const valId = currentMessageIdRef.current
          if (valId) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === valId
                  ? { ...m, content: valPayload.message, status: 'validation_error' as const }
                  : m,
              ),
            )
          } else {
            setMessages((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: valPayload.message,
                status: 'validation_error' as const,
                timestamp: Date.now(),
              },
            ])
          }
          currentMessageIdRef.current = null
          break
        }
        case 'conversation_summarized': {
          const sumPayload = msg.payload as { originalTurnCount: number; retainedTurnCount: number }
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: 'system',
              content: `Earlier messages summarized (${String(sumPayload.originalTurnCount)} turns compressed to ${String(sumPayload.retainedTurnCount)})`,
              status: 'complete',
              timestamp: Date.now(),
            },
          ])
          break
        }
      }
    },
    [flushBuffer, addSuggestion],
  )

  const { status, send } = useWebSocket({ url: WS_URL, onMessage })

  useEffect(() => { sendRef.current = send }, [send])

  // Track which message IDs are auto-analysis for labeling
  const autoAnalysisMessageIds = useRef(new Set<string>())

  const handleAutoAnalyzeTrigger = useCallback(
    (result: { graphState: import('./types/graph').GraphState; delta: import('./types/graph').GraphDelta }) => {
      if (status !== 'connected' || isStreaming) return

      const aiMessageId = crypto.randomUUID()
      autoAnalysisMessageIds.current.add(aiMessageId)
      currentMessageIdRef.current = aiMessageId

      setMessages((prev) => [
        ...prev,
        {
          id: aiMessageId,
          role: 'assistant',
          content: '',
          status: 'streaming',
          timestamp: Date.now(),
          isAutoAnalysis: true,
        },
      ])

      setIsStreaming(true)
      streamBufferRef.current = ''

      send({
        type: 'auto_analyze_request',
        payload: { graphState: result.graphState, delta: result.delta },
        requestId: aiMessageId,
      })
    },
    [status, isStreaming, send],
  )

  const autoAnalyze = useAutoAnalyze({
    isStreaming,
    onTrigger: handleAutoAnalyzeTrigger,
  })

  // Watch for structural graph changes and trigger auto-analyze when enabled
  const prevGraphStateRef = useRef(graphState.graphState)
  const { enabled: autoEnabled, checkForChanges, onStreamEnd, cancelPending } = autoAnalyze
  useEffect(() => {
    if (autoEnabled && graphState.graphState !== prevGraphStateRef.current) {
      checkForChanges(graphState.graphState)
    }
    prevGraphStateRef.current = graphState.graphState
  }, [graphState.graphState, autoEnabled, checkForChanges])

  // Flush queued auto-analysis when streaming ends
  const prevStreamingRef = useRef(isStreaming)
  useEffect(() => {
    if (prevStreamingRef.current && !isStreaming && autoEnabled) {
      onStreamEnd()
    }
    prevStreamingRef.current = isStreaming
  }, [isStreaming, autoEnabled, onStreamEnd])

  const handleChatSubmit = useCallback((text: string) => {
    if (status !== 'connected' || isStreaming) return

    // Cancel any pending auto-analyze trigger -- manual message takes priority
    cancelPending()

    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: 'user',
        content: text,
        status: 'complete',
        timestamp: Date.now(),
      },
    ])

    const aiMessageId = crypto.randomUUID()
    currentMessageIdRef.current = aiMessageId
    setMessages((prev) => [
      ...prev,
      {
        id: aiMessageId,
        role: 'assistant',
        content: '',
        status: 'streaming',
        timestamp: Date.now(),
      },
    ])

    setIsStreaming(true)
    streamBufferRef.current = ''

    // Build pending suggestions payload for three-view prompt
    const pendingSuggestions = hasPending ? {
      additions: {
        nodes: suggestions.additions.nodes.map((n) => ({ type: n.type, name: n.name })),
        edges: suggestions.additions.edges.map((e) => {
          const srcNode = nodesRef.current.find((n) => n.id === e.source)
          const tgtNode = nodesRef.current.find((n) => n.id === e.target)
          const srcPending = suggestions.additions.nodes.find((n) => n.id === e.source)
          const tgtPending = suggestions.additions.nodes.find((n) => n.id === e.target)
          return {
            source: srcNode?.data.label ?? srcPending?.name ?? e.source,
            target: tgtNode?.data.label ?? tgtPending?.name ?? e.target,
            protocol: e.protocol ?? '',
            direction: e.direction ?? 'oneWay',
          }
        }),
      },
      deletions: {
        nodeNames: suggestions.deletions.nodeIds.map((id) => {
          const node = nodesRef.current.find((n) => n.id === id)
          return node?.data.label ?? id
        }),
        edges: suggestions.deletions.edgeIds.map((id) => {
          const edge = edgesRef.current.find((e) => e.id === id)
          const srcNode = nodesRef.current.find((n) => n.id === edge?.source)
          const tgtNode = nodesRef.current.find((n) => n.id === edge?.target)
          return {
            source: srcNode?.data.label ?? '',
            target: tgtNode?.data.label ?? '',
            protocol: edge?.data?.protocol ?? '',
            direction: edge?.data?.direction ?? 'oneWay',
          }
        }),
      },
      modifications: {
        nodes: suggestions.modifications.nodes.map((m) => ({
          name: m.nodeName,
          newName: m.newValues.name ?? '',
        })),
        edges: suggestions.modifications.edges.map((m) => ({
          source: '', target: '',
          newProtocol: m.newValues.protocol ?? '',
          newDirection: m.newValues.direction ?? '',
        })),
      },
    } : undefined

    send({
      type: 'chat_message',
      payload: { text, graphState: graphState.graphState, pendingSuggestions },
      requestId: aiMessageId,
    })
  }, [status, isStreaming, send, graphState.graphState, hasPending, suggestions, nodesRef, edgesRef, cancelPending])

  return (
    <AnnotationProvider onAnnotationClick={handleAnnotationClick}>
    <div className="app-container">
      <header className="app-header">
        <div className="app-header-left">
          <button
            className="palette-toggle"
            onClick={() => { setPaletteOpen((v) => !v) }}
            data-testid="palette-toggle"
            title={paletteOpen ? 'Hide palette' : 'Show palette'}
          >
            {paletteOpen ? '\u2630' : '\u2630'}
          </button>
          <span className="app-title">DesignPair</span>
        </div>
        <div className="app-header-actions">
          <button
            onClick={() => { setShowExamples(true) }}
            className="header-btn"
            data-testid="examples-button"
          >
            Examples
          </button>
          <div ref={exportMenuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => { setExportMenuOpen((v) => !v) }}
              className="header-btn"
              data-testid="export-button"
            >
              Export
            </button>
            {exportMenuOpen && (
              <div
                className="export-dropdown"
                data-testid="export-dropdown"
              >
                <button
                  className="export-dropdown-item"
                  onClick={handleExportJSON}
                  data-testid="export-json"
                >
                  DesignPair (JSON)
                </button>
                <button
                  className="export-dropdown-item"
                  onClick={handleExportMermaid}
                  data-testid="export-mermaid"
                >
                  Mermaid
                </button>
                <button
                  className="export-dropdown-item"
                  onClick={handleExportDrawio}
                  data-testid="export-drawio"
                >
                  draw.io
                </button>
              </div>
            )}
          </div>
          <button
            onClick={handleImport}
            className="header-btn"
            data-testid="import-button"
          >
            Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            style={{ display: 'none' }}
            data-testid="import-file-input"
          />
          {canvasHasContent && (
            <button
              onClick={handleClearCanvas}
              className="header-btn header-btn-danger"
              data-testid="clear-canvas-button"
            >
              Clear Canvas
            </button>
          )}
          {hasPending && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} data-testid="suggestion-bar">
              <span style={{ fontSize: 12, color: '#6b7280' }}>Pending suggestions</span>
              <button
                onClick={approveAll}
                style={{
                  padding: '4px 12px', fontSize: 12, fontWeight: 600,
                  background: '#22c55e', color: '#fff', border: 'none',
                  borderRadius: 4, cursor: 'pointer',
                }}
                data-testid="approve-all"
              >
                Approve All
              </button>
              <button
                onClick={discardAll}
                style={{
                  padding: '4px 12px', fontSize: 12, fontWeight: 600,
                  background: '#ef4444', color: '#fff', border: 'none',
                  borderRadius: 4, cursor: 'pointer',
                }}
                data-testid="discard-all"
              >
                Discard All
              </button>
            </div>
          )}
          <ConnectionStatus status={status} />
        </div>
      </header>
      <div className="app-body">
        {paletteOpen && <Palette />}
        <Canvas graphState={graphState} onEdgeClick={handleEdgeClick} onPaneClick={handlePaneClick} />
        <ChatPanel
          messages={messages}
          isStreaming={isStreaming}
          isConnected={status === 'connected'}
          onSubmit={handleChatSubmit}
          onResetChat={resetChat}
          turnsRemaining={turnsRemaining}
          inputValue={chatInput}
          onInputChange={setChatInput}
          autoAnalyzeEnabled={autoAnalyze.enabled}
          onToggleAutoAnalyze={autoAnalyze.toggle}
        />
        {new URLSearchParams(window.location.search).has('debug') && (
          <DebugPanel graphState={graphState.graphState} />
        )}
      </div>
      {edgeMenu && (() => {
        const edge = graphState.edges.find((e) => e.id === edgeMenu.edgeId)
        if (!edge) return null
        return (
          <EdgeContextMenu
            edgeId={edgeMenu.edgeId}
            x={edgeMenu.x}
            y={edgeMenu.y}
            currentProtocol={edge.data?.protocol}
            currentLabel={edge.data?.label}
            currentDirection={edge.data?.direction ?? 'oneWay'}
            currentSyncAsync={edge.data?.syncAsync ?? 'sync'}
            onSelectProtocol={graphState.updateEdgeProtocol}
            onToggleDirection={graphState.toggleEdgeDirection}
            onReverse={graphState.reverseEdge}
            onToggleSyncAsync={graphState.toggleSyncAsync}
            onClose={() => { setEdgeMenu(null) }}
          />
        )
      })()}
      {showExamples && (
        <ExampleSelector
          onSelect={handleExampleSelect}
          onClose={() => { setShowExamples(false) }}
        />
      )}
      {pendingExample && (
        <div
          className="example-overlay"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}
          data-testid="confirm-overlay"
        >
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600, color: '#111827' }}>Replace current diagram?</h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280' }}>
              Loading &ldquo;{pendingExample.name}&rdquo; will replace your current diagram. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={handleCancelExample}
                style={{ padding: '6px 16px', fontSize: 13, background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer' }}
                data-testid="confirm-cancel"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmExample}
                style={{ padding: '6px 16px', fontSize: 13, fontWeight: 600, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                data-testid="confirm-replace"
              >
                Replace
              </button>
            </div>
          </div>
        </div>
      )}
      {pendingClear && (
        <div
          className="example-overlay"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}
          data-testid="clear-confirm-overlay"
        >
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600, color: '#111827' }}>Clear the canvas?</h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280' }}>
              This will remove all components and connections.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={handleCancelClear}
                style={{ padding: '6px 16px', fontSize: 13, background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer' }}
                data-testid="clear-confirm-cancel"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmClear}
                style={{ padding: '6px 16px', fontSize: 13, fontWeight: 600, background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                data-testid="clear-confirm-ok"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
      {activeAnnotationPanel && (() => {
        const node = graphState.nodes.find((n) => n.id === activeAnnotationPanel.nodeId)
        if (!node) return null
        return (
          <AnnotationPanel
            nodeId={activeAnnotationPanel.nodeId}
            nodeName={node.data.label}
            annotation={node.data.annotation ?? ''}
            x={activeAnnotationPanel.x}
            y={activeAnnotationPanel.y}
            onUpdate={handleAnnotationUpdate}
            onClose={() => { setAnnotationPanel(null) }}
          />
        )
      })()}
    </div>
    </AnnotationProvider>
  )
}

function App() {
  return (
    <ReactFlowProvider>
      <AppContent />
    </ReactFlowProvider>
  )
}

export default App
