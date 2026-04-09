import { useEffect, useRef, useState } from 'react'
import './ChatPanel.css'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  status: 'streaming' | 'complete' | 'error'
  timestamp: number
}

interface ChatPanelProps {
  messages: ChatMessage[]
  isStreaming: boolean
  isConnected: boolean
  onSubmit: (text: string) => void
}

const MAX_CHARS = 2000
const DEFAULT_PROMPT = 'Analyze my architecture'

export function ChatPanel({ messages, isStreaming, isConnected, onSubmit }: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState('')

  const lastMessageContent = messages[messages.length - 1]?.content
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, lastMessageContent])

  const canSubmit = isConnected && !isStreaming && input.length <= MAX_CHARS

  function handleSubmit() {
    if (!canSubmit) return
    const text = input.trim() || DEFAULT_PROMPT
    onSubmit(text)
    setInput('')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <aside className="chat-panel" data-testid="chat-panel">
      <h3 className="chat-panel-title">AI Collaborator</h3>
      <div className="chat-messages">
        {messages.length === 0 && (
          <p className="chat-empty">Draw some components and press Enter to get architectural feedback, or type a question.</p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`chat-message chat-message-${msg.role}`}
            data-testid={`chat-message-${msg.id}`}
          >
            <div className="chat-message-role">{msg.role === 'user' ? 'You' : 'AI'}</div>
            <div className="chat-message-content">{msg.content}</div>
            {msg.status === 'error' && (
              <div className="chat-message-error">An error occurred</div>
            )}
          </div>
        ))}
        {isStreaming && (
          <div className="chat-streaming" data-testid="streaming-indicator">
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="chat-input-area">
        <div className="chat-input-row">
          <input
            className="chat-input"
            type="text"
            value={input}
            onChange={(e) => { setInput(e.target.value) }}
            onKeyDown={handleKeyDown}
            placeholder={isStreaming ? 'Waiting for response...' : 'Ask about your architecture...'}
            disabled={!isConnected || isStreaming}
            maxLength={MAX_CHARS}
            data-testid="chat-input"
          />
          <button
            className="chat-send"
            onClick={handleSubmit}
            disabled={!canSubmit}
            data-testid="chat-send"
          >
            Send
          </button>
        </div>
        {input.length > MAX_CHARS - 200 && (
          <div className="chat-char-count" data-testid="char-count">
            {input.length}/{MAX_CHARS}
          </div>
        )}
      </div>
    </aside>
  )
}
