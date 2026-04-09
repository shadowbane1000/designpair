import { useCallback, useRef, useState } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { Canvas } from './components/Canvas/Canvas'
import { Palette } from './components/Palette/Palette'
import { DebugPanel } from './components/DebugPanel/DebugPanel'
import { ChatPanel, type ChatMessage } from './components/ChatPanel/ChatPanel'
import { ConnectionStatus } from './components/ConnectionStatus/ConnectionStatus'
import { useGraphState } from './hooks/useGraphState'
import { useWebSocket } from './hooks/useWebSocket'
import type { WSMessage } from './types/websocket'

const WS_URL = `ws://${window.location.hostname}:8081/ws`

function AppContent() {
  const graphState = useGraphState()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
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
          // Final flush
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

  const handleAskAI = useCallback(() => {
    if (status !== 'connected' || isStreaming) return

    // Add user message
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: 'user',
        content: 'Analyze my architecture',
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
      type: 'analyze_request',
      payload: { graphState: graphState.graphState },
      requestId: aiMessageId,
    })
  }, [status, isStreaming, send, graphState.graphState])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', borderBottom: '1px solid #e5e7eb', background: '#fff' }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>DesignPair</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={handleAskAI}
            disabled={status !== 'connected' || isStreaming}
            data-testid="ask-ai-button"
            style={{
              padding: '6px 16px',
              borderRadius: 6,
              border: 'none',
              background: status === 'connected' && !isStreaming ? '#3b82f6' : '#9ca3af',
              color: '#fff',
              fontSize: 13,
              fontWeight: 500,
              cursor: status === 'connected' && !isStreaming ? 'pointer' : 'not-allowed',
            }}
          >
            {isStreaming ? 'Analyzing...' : 'Ask AI'}
          </button>
          <ConnectionStatus status={status} />
        </div>
      </header>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Palette />
        <Canvas graphState={graphState} />
        <ChatPanel messages={messages} isStreaming={isStreaming} />
        <DebugPanel graphState={graphState.graphState} />
      </div>
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
