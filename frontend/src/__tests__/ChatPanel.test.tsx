import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChatPanel, type ChatMessage } from '../components/ChatPanel/ChatPanel'

beforeAll(() => {
  // jsdom does not implement scrollIntoView
  Element.prototype.scrollIntoView = vi.fn()
})

function makeMessage(
  overrides: Partial<ChatMessage> & { id: string },
): ChatMessage {
  return {
    role: 'assistant',
    content: 'Hello',
    status: 'complete',
    timestamp: Date.now(),
    ...overrides,
  }
}

const baseProps = {
  messages: [] as ChatMessage[],
  isStreaming: false,
  isConnected: true,
  onSubmit: vi.fn(),
  onResetChat: vi.fn(),
  autoAnalyzeEnabled: false,
  onToggleAutoAnalyze: vi.fn(),
}

describe('ChatPanel', () => {
  it('renders empty state message when no messages', () => {
    render(<ChatPanel {...baseProps} />)
    expect(
      screen.getByText(/Draw some components/),
    ).toBeInTheDocument()
  })

  it('renders user and assistant messages', () => {
    const messages: ChatMessage[] = [
      makeMessage({ id: 'u1', role: 'user', content: 'How is my arch?' }),
      makeMessage({ id: 'a1', role: 'assistant', content: 'Looks great!' }),
    ]
    render(<ChatPanel {...baseProps} messages={messages} />)

    expect(screen.getByText('How is my arch?')).toBeInTheDocument()
    expect(screen.getByText('Looks great!')).toBeInTheDocument()
    expect(screen.getByText('You')).toBeInTheDocument()
    expect(screen.getByText('AI')).toBeInTheDocument()
  })

  it('renders system messages differently', () => {
    const messages: ChatMessage[] = [
      makeMessage({ id: 's1', role: 'system', content: 'Chat cleared' }),
    ]
    render(<ChatPanel {...baseProps} messages={messages} />)
    expect(screen.getByText('Chat cleared')).toBeInTheDocument()
    // System messages don't have the role label
    expect(screen.queryByText('You')).not.toBeInTheDocument()
  })

  it('shows auto-analysis label for auto-analysis messages', () => {
    const messages: ChatMessage[] = [
      makeMessage({ id: 'aa1', role: 'assistant', content: 'Auto analysis result', isAutoAnalysis: true }),
    ]
    render(<ChatPanel {...baseProps} messages={messages} />)
    expect(screen.getByText('AI (auto-analysis)')).toBeInTheDocument()
  })

  it('shows error indicator for error messages', () => {
    const messages: ChatMessage[] = [
      makeMessage({ id: 'e1', role: 'assistant', content: 'Oops', status: 'error' }),
    ]
    render(<ChatPanel {...baseProps} messages={messages} />)
    expect(screen.getByText('An error occurred')).toBeInTheDocument()
  })

  it('shows validation error indicator', () => {
    const messages: ChatMessage[] = [
      makeMessage({ id: 've1', role: 'assistant', content: 'Blocked', status: 'validation_error' }),
    ]
    render(<ChatPanel {...baseProps} messages={messages} />)
    expect(screen.getByText('Request blocked')).toBeInTheDocument()
  })

  it('calls onSubmit with input text when send is clicked', () => {
    const onSubmit = vi.fn()
    render(<ChatPanel {...baseProps} onSubmit={onSubmit} />)

    const input = screen.getByTestId('chat-input')
    fireEvent.change(input, { target: { value: 'Test question' } })

    const sendBtn = screen.getByTestId('chat-send')
    fireEvent.click(sendBtn)

    expect(onSubmit).toHaveBeenCalledWith('Test question')
  })

  it('calls onSubmit with default prompt when input is empty', () => {
    const onSubmit = vi.fn()
    render(<ChatPanel {...baseProps} onSubmit={onSubmit} />)

    const sendBtn = screen.getByTestId('chat-send')
    fireEvent.click(sendBtn)

    expect(onSubmit).toHaveBeenCalledWith('Analyze my architecture')
  })

  it('submits on Enter key', () => {
    const onSubmit = vi.fn()
    render(<ChatPanel {...baseProps} onSubmit={onSubmit} />)

    const input = screen.getByTestId('chat-input')
    fireEvent.change(input, { target: { value: 'Via enter' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onSubmit).toHaveBeenCalledWith('Via enter')
  })

  it('does not submit on Shift+Enter', () => {
    const onSubmit = vi.fn()
    render(<ChatPanel {...baseProps} onSubmit={onSubmit} />)

    const input = screen.getByTestId('chat-input')
    fireEvent.change(input, { target: { value: 'No submit' } })
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('clears input after submit', () => {
    render(<ChatPanel {...baseProps} />)

    const input = screen.getByTestId('chat-input')
    fireEvent.change(input, { target: { value: 'Clear me' } })
    fireEvent.click(screen.getByTestId('chat-send'))

    expect(input).toHaveValue('')
  })

  it('shows clear button when messages exist and onResetChat is provided', () => {
    const messages: ChatMessage[] = [
      makeMessage({ id: 'u1', role: 'user', content: 'Hi' }),
    ]
    render(<ChatPanel {...baseProps} messages={messages} />)
    expect(screen.getByTestId('chat-clear')).toBeInTheDocument()
  })

  it('does not show clear button when messages are empty', () => {
    render(<ChatPanel {...baseProps} />)
    expect(screen.queryByTestId('chat-clear')).not.toBeInTheDocument()
  })

  it('does not show clear button when onResetChat is not provided', () => {
    const messages: ChatMessage[] = [
      makeMessage({ id: 'u1', role: 'user', content: 'Hi' }),
    ]
    render(
      <ChatPanel {...baseProps} messages={messages} onResetChat={undefined} />,
    )
    expect(screen.queryByTestId('chat-clear')).not.toBeInTheDocument()
  })

  it('disables clear button while streaming', () => {
    const messages: ChatMessage[] = [
      makeMessage({ id: 'u1', role: 'user', content: 'Hi' }),
    ]
    render(<ChatPanel {...baseProps} messages={messages} isStreaming />)
    const clearBtn = screen.getByTestId('chat-clear')
    expect(clearBtn).toBeDisabled()
  })

  it('shows streaming indicator while streaming', () => {
    render(<ChatPanel {...baseProps} isStreaming />)
    expect(screen.getByTestId('streaming-indicator')).toBeInTheDocument()
  })

  it('does not show streaming indicator when not streaming', () => {
    render(<ChatPanel {...baseProps} />)
    expect(screen.queryByTestId('streaming-indicator')).not.toBeInTheDocument()
  })

  it('disables input and send when not connected', () => {
    render(<ChatPanel {...baseProps} isConnected={false} />)

    const input = screen.getByTestId('chat-input')
    const sendBtn = screen.getByTestId('chat-send')
    expect(input).toBeDisabled()
    expect(sendBtn).toBeDisabled()
  })

  it('disables input and send while streaming', () => {
    render(<ChatPanel {...baseProps} isStreaming />)

    const input = screen.getByTestId('chat-input')
    const sendBtn = screen.getByTestId('chat-send')
    expect(input).toBeDisabled()
    expect(sendBtn).toBeDisabled()
  })

  it('shows auto-analyze toggle', () => {
    render(<ChatPanel {...baseProps} />)
    expect(screen.getByTestId('auto-analyze-toggle')).toBeInTheDocument()
  })

  it('auto-analyze toggle reflects enabled state', () => {
    render(<ChatPanel {...baseProps} autoAnalyzeEnabled />)
    const switchBtn = screen.getByTestId('auto-analyze-switch')
    expect(switchBtn.getAttribute('aria-checked')).toBe('true')
  })

  it('auto-analyze toggle reflects disabled state', () => {
    render(<ChatPanel {...baseProps} autoAnalyzeEnabled={false} />)
    const switchBtn = screen.getByTestId('auto-analyze-switch')
    expect(switchBtn.getAttribute('aria-checked')).toBe('false')
  })

  it('calls onToggleAutoAnalyze when switch is clicked', () => {
    const onToggleAutoAnalyze = vi.fn()
    render(<ChatPanel {...baseProps} onToggleAutoAnalyze={onToggleAutoAnalyze} />)

    fireEvent.click(screen.getByTestId('auto-analyze-switch'))
    expect(onToggleAutoAnalyze).toHaveBeenCalledTimes(1)
  })

  it('shows turns remaining when provided', () => {
    render(<ChatPanel {...baseProps} turnsRemaining={5} />)
    expect(screen.getByTestId('turns-remaining')).toHaveTextContent('5 turns remaining')
  })

  it('shows singular "turn" for 1 remaining', () => {
    render(<ChatPanel {...baseProps} turnsRemaining={1} />)
    expect(screen.getByTestId('turns-remaining')).toHaveTextContent('1 turn remaining')
  })

  it('shows limit reached message when turns are 0', () => {
    render(<ChatPanel {...baseProps} turnsRemaining={0} />)
    expect(screen.getByTestId('turns-remaining')).toHaveTextContent(
      'Conversation limit reached',
    )
  })

  it('does not show turns remaining when null', () => {
    render(<ChatPanel {...baseProps} turnsRemaining={null} />)
    expect(screen.queryByTestId('turns-remaining')).not.toBeInTheDocument()
  })

  it('shows character count near the limit', () => {
    render(<ChatPanel {...baseProps} />)

    const input = screen.getByTestId('chat-input')
    // 2000 - 200 = 1800 is the threshold
    fireEvent.change(input, { target: { value: 'x'.repeat(1850) } })

    expect(screen.getByTestId('char-count')).toHaveTextContent('1850/2000')
  })

  it('does not show character count when well under limit', () => {
    render(<ChatPanel {...baseProps} />)

    const input = screen.getByTestId('chat-input')
    fireEvent.change(input, { target: { value: 'short' } })

    expect(screen.queryByTestId('char-count')).not.toBeInTheDocument()
  })
})
