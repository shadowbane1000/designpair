import { useEffect, useRef } from 'react'
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
}

export function ChatPanel({ messages, isStreaming }: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  const lastMessageContent = messages[messages.length - 1]?.content
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, lastMessageContent])

  return (
    <aside className="chat-panel" data-testid="chat-panel">
      <h3 className="chat-panel-title">AI Collaborator</h3>
      <div className="chat-messages">
        {messages.length === 0 && (
          <p className="chat-empty">Draw some components and click &ldquo;Ask AI&rdquo; to get architectural feedback.</p>
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
    </aside>
  )
}
