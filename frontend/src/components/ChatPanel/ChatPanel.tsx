import { useEffect, useRef, useState } from 'react'
import './ChatPanel.css'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  status: 'streaming' | 'complete' | 'error' | 'validation_error'
  timestamp: number
  isAutoAnalysis?: boolean
}

interface ChatPanelProps {
  messages: ChatMessage[]
  isStreaming: boolean
  isConnected: boolean
  onSubmit: (text: string) => void
  turnsRemaining?: number | null
  inputValue?: string
  onInputChange?: (value: string) => void
  autoAnalyzeEnabled: boolean
  onToggleAutoAnalyze: () => void
}

const MAX_CHARS = 2000
const DEFAULT_PROMPT = 'Analyze my architecture'

export function ChatPanel({ messages, isStreaming, isConnected, onSubmit, turnsRemaining, inputValue, onInputChange, autoAnalyzeEnabled, onToggleAutoAnalyze }: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const [internalInput, setInternalInput] = useState('')

  // Use controlled mode when parent provides inputValue/onInputChange
  const isControlled = inputValue !== undefined && onInputChange !== undefined
  const input = isControlled ? inputValue : internalInput
  const setInput = isControlled ? onInputChange : setInternalInput

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
      <div className="chat-panel-header">
        <h3 className="chat-panel-title">AI Collaborator</h3>
        <label className="auto-analyze-toggle" data-testid="auto-analyze-toggle">
          <span className="auto-analyze-label">Auto</span>
          <button
            type="button"
            role="switch"
            aria-checked={autoAnalyzeEnabled}
            className={`auto-analyze-switch${autoAnalyzeEnabled ? ' auto-analyze-switch-on' : ''}`}
            onClick={onToggleAutoAnalyze}
            data-testid="auto-analyze-switch"
          >
            <span className="auto-analyze-thumb" />
          </button>
        </label>
      </div>
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
            <div className="chat-message-role">{msg.role === 'user' ? 'You' : msg.isAutoAnalysis ? 'AI (auto-analysis)' : 'AI'}</div>
            <div className="chat-message-content">{msg.content}</div>
            {msg.status === 'error' && (
              <div className="chat-message-error">An error occurred</div>
            )}
            {msg.status === 'validation_error' && (
              <div className="chat-message-validation-error">Request blocked</div>
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
      {turnsRemaining != null && (
        <div
          className={`chat-turns-remaining${turnsRemaining <= 3 ? ' chat-turns-warning' : ''}`}
          data-testid="turns-remaining"
        >
          {turnsRemaining === 0
            ? 'Conversation limit reached — refresh to start a new session'
            : `${String(turnsRemaining)} turn${turnsRemaining === 1 ? '' : 's'} remaining`}
        </div>
      )}
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
