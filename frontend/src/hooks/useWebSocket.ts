import { useCallback, useEffect, useRef, useState } from 'react'

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting'

interface UseWebSocketOptions {
  url: string
  onMessage: (data: unknown) => void
}

const INITIAL_DELAY = 1000
const MAX_DELAY = 30000
const MULTIPLIER = 2
const JITTER = 0.2

export function useWebSocket({ url, onMessage }: UseWebSocketOptions) {
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const wsRef = useRef<WebSocket | null>(null)
  const attemptRef = useRef(0)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onMessageRef = useRef(onMessage)
  const urlRef = useRef(url)

  // Keep refs in sync via effect (not during render)
  useEffect(() => {
    onMessageRef.current = onMessage
  }, [onMessage])

  useEffect(() => {
    urlRef.current = url
  }, [url])

  useEffect(() => {
    let disposed = false

    function scheduleReconnect() {
      const delay = Math.min(
        INITIAL_DELAY * Math.pow(MULTIPLIER, attemptRef.current),
        MAX_DELAY,
      )
      const jitteredDelay = delay * (1 + (Math.random() * 2 - 1) * JITTER)
      attemptRef.current++

      reconnectTimerRef.current = setTimeout(() => {
        if (!disposed) connect()
      }, jitteredDelay)
    }

    function connect() {
      if (disposed) return

      setStatus('connecting')
      const ws = new WebSocket(urlRef.current)

      ws.onopen = () => {
        if (disposed) { ws.close(); return }
        setStatus('connected')
        attemptRef.current = 0
      }

      ws.onmessage = (event: MessageEvent) => {
        try {
          const data: unknown = JSON.parse(event.data as string)
          onMessageRef.current(data)
        } catch {
          // Ignore unparseable messages
        }
      }

      ws.onclose = () => {
        wsRef.current = null
        if (!disposed) {
          setStatus('reconnecting')
          scheduleReconnect()
        }
      }

      ws.onerror = () => {
        ws.close()
      }

      wsRef.current = ws
    }

    connect()

    return () => {
      disposed = true
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
      }
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [url])

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  return { status, send }
}
