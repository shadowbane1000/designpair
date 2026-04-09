import { useCallback, useRef, useState } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { Canvas } from './components/Canvas/Canvas'
import { Palette } from './components/Palette/Palette'
import { DebugPanel } from './components/DebugPanel/DebugPanel'
import { ChatPanel, type ChatMessage } from './components/ChatPanel/ChatPanel'
import { ConnectionStatus } from './components/ConnectionStatus/ConnectionStatus'
import { EdgeContextMenu } from './components/EdgeContextMenu/EdgeContextMenu'
import { useGraphState } from './hooks/useGraphState'
import { useWebSocket } from './hooks/useWebSocket'
import type { WSMessage } from './types/websocket'

const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
const WS_URL = `${wsProtocol}//${window.location.host}/ws`

function AppContent() {
  const graphState = useGraphState()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [edgeMenu, setEdgeMenu] = useState<{ edgeId: string; x: number; y: number } | null>(null)

  const handleEdgeClick = useCallback((_event: React.MouseEvent, edge: { id: string; data?: Record<string, unknown> }) => {
    setEdgeMenu({ edgeId: edge.id, x: _event.clientX, y: _event.clientY })
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
          const doneId = currentMessageIdRef.current
          if (doneId) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === doneId ? { ...m, status: 'complete' as const } : m,
              ),
            )
          }
          currentMessageIdRef.current = null
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
      }
    },
    [flushBuffer],
  )

  const { status, send } = useWebSocket({ url: WS_URL, onMessage })

  const handleChatSubmit = useCallback((text: string) => {
    if (status !== 'connected' || isStreaming) return

    // Add user message
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

    // Add placeholder AI message
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

    send({
      type: 'chat_message',
      payload: { text, graphState: graphState.graphState },
      requestId: aiMessageId,
    })
  }, [status, isStreaming, send, graphState.graphState])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', borderBottom: '1px solid #e5e7eb', background: '#fff' }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>DesignPair</span>
        <ConnectionStatus status={status} />
      </header>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Palette />
        <Canvas graphState={graphState} onEdgeClick={handleEdgeClick} />
        <ChatPanel
          messages={messages}
          isStreaming={isStreaming}
          isConnected={status === 'connected'}
          onSubmit={handleChatSubmit}
        />
        <DebugPanel graphState={graphState.graphState} />
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
    </div>
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
