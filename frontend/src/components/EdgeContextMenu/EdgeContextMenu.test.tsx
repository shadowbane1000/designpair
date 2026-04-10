import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EdgeContextMenu } from './EdgeContextMenu'

const defaultProps = {
  edgeId: 'edge-1',
  x: 100,
  y: 200,
  currentDirection: 'oneWay' as const,
  currentSyncAsync: 'sync' as const,
  onSelectProtocol: vi.fn(),
  onToggleDirection: vi.fn(),
  onReverse: vi.fn(),
  onToggleSyncAsync: vi.fn(),
  onClose: vi.fn(),
}

describe('EdgeContextMenu custom protocol', () => {
  it('saves custom protocol text on blur', () => {
    const onSelectProtocol = vi.fn()
    render(
      <EdgeContextMenu {...defaultProps} onSelectProtocol={onSelectProtocol} />,
    )

    const input = screen.getByPlaceholderText('Custom...')
    fireEvent.change(input, { target: { value: 'amqp' } })
    fireEvent.blur(input)

    expect(onSelectProtocol).toHaveBeenCalledWith('edge-1', 'custom', 'amqp')
  })

  it('does not save empty custom text on blur', () => {
    const onSelectProtocol = vi.fn()
    render(
      <EdgeContextMenu {...defaultProps} onSelectProtocol={onSelectProtocol} />,
    )

    const input = screen.getByPlaceholderText('Custom...')
    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.blur(input)

    expect(onSelectProtocol).not.toHaveBeenCalled()
  })

  it('pre-fills custom input when current protocol is custom', () => {
    render(
      <EdgeContextMenu
        {...defaultProps}
        currentProtocol="custom"
        currentLabel="amqp"
      />,
    )

    const input = screen.getByPlaceholderText('Custom...')
    expect(input).toHaveValue('amqp')
  })

  it('clears custom input when a predefined protocol is clicked', () => {
    render(
      <EdgeContextMenu {...defaultProps} />,
    )

    const input = screen.getByPlaceholderText('Custom...')
    fireEvent.change(input, { target: { value: 'amqp' } })
    expect(input).toHaveValue('amqp')

    const httpBtn = screen.getByText('HTTP')
    fireEvent.click(httpBtn)

    expect(input).toHaveValue('')
  })

  it('does not pre-fill custom input for predefined protocols', () => {
    render(
      <EdgeContextMenu
        {...defaultProps}
        currentProtocol="http"
        currentLabel="HTTP"
      />,
    )

    const input = screen.getByPlaceholderText('Custom...')
    expect(input).toHaveValue('')
  })

  it('saves custom protocol on Enter key', () => {
    const onSelectProtocol = vi.fn()
    render(
      <EdgeContextMenu {...defaultProps} onSelectProtocol={onSelectProtocol} />,
    )

    const input = screen.getByPlaceholderText('Custom...')
    fireEvent.change(input, { target: { value: 'kafka' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onSelectProtocol).toHaveBeenCalledWith('edge-1', 'custom', 'kafka')
  })

  it('does not save custom protocol on Enter when empty', () => {
    const onSelectProtocol = vi.fn()
    render(
      <EdgeContextMenu {...defaultProps} onSelectProtocol={onSelectProtocol} />,
    )

    const input = screen.getByPlaceholderText('Custom...')
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onSelectProtocol).not.toHaveBeenCalled()
  })
})

describe('EdgeContextMenu protocol selection', () => {
  it('renders all predefined protocol buttons', () => {
    render(<EdgeContextMenu {...defaultProps} />)

    expect(screen.getByText('HTTP')).toBeInTheDocument()
    expect(screen.getByText('gRPC')).toBeInTheDocument()
    expect(screen.getByText('SQL')).toBeInTheDocument()
    expect(screen.getByText('TCP')).toBeInTheDocument()
    expect(screen.getByText('async')).toBeInTheDocument()
    expect(screen.getByText('pub/sub')).toBeInTheDocument()
    expect(screen.getByText('WebSocket')).toBeInTheDocument()
    expect(screen.getByText('MQTT')).toBeInTheDocument()
  })

  it('calls onSelectProtocol with correct args when protocol button clicked', () => {
    const onSelectProtocol = vi.fn()
    render(
      <EdgeContextMenu {...defaultProps} onSelectProtocol={onSelectProtocol} />,
    )

    fireEvent.click(screen.getByText('gRPC'))
    expect(onSelectProtocol).toHaveBeenCalledWith('edge-1', 'grpc', 'gRPC')
  })

  it('highlights the currently active protocol', () => {
    render(
      <EdgeContextMenu {...defaultProps} currentProtocol="http" />,
    )

    const httpBtn = screen.getByText('HTTP')
    expect(httpBtn.className).toContain('active')

    const grpcBtn = screen.getByText('gRPC')
    expect(grpcBtn.className).not.toContain('active')
  })
})

describe('EdgeContextMenu direction toggle', () => {
  it('shows one-way text when direction is oneWay', () => {
    render(
      <EdgeContextMenu {...defaultProps} currentDirection="oneWay" />,
    )

    const toggle = screen.getByTestId('direction-toggle')
    expect(toggle).toHaveTextContent('One-way')
  })

  it('shows bidirectional text when direction is bidirectional', () => {
    render(
      <EdgeContextMenu {...defaultProps} currentDirection="bidirectional" />,
    )

    const toggle = screen.getByTestId('direction-toggle')
    expect(toggle).toHaveTextContent('Bidirectional')
  })

  it('calls onToggleDirection with edge ID', () => {
    const onToggleDirection = vi.fn()
    render(
      <EdgeContextMenu {...defaultProps} onToggleDirection={onToggleDirection} />,
    )

    fireEvent.click(screen.getByTestId('direction-toggle'))
    expect(onToggleDirection).toHaveBeenCalledWith('edge-1')
  })

  it('reverse button is disabled when bidirectional', () => {
    render(
      <EdgeContextMenu {...defaultProps} currentDirection="bidirectional" />,
    )

    const reverseBtn = screen.getByTestId('reverse-btn')
    expect(reverseBtn).toBeDisabled()
  })

  it('reverse button is enabled when oneWay', () => {
    render(
      <EdgeContextMenu {...defaultProps} currentDirection="oneWay" />,
    )

    const reverseBtn = screen.getByTestId('reverse-btn')
    expect(reverseBtn).not.toBeDisabled()
  })

  it('calls onReverse with edge ID', () => {
    const onReverse = vi.fn()
    render(
      <EdgeContextMenu {...defaultProps} onReverse={onReverse} />,
    )

    fireEvent.click(screen.getByTestId('reverse-btn'))
    expect(onReverse).toHaveBeenCalledWith('edge-1')
  })
})

describe('EdgeContextMenu sync/async toggle', () => {
  it('shows sync text when sync', () => {
    render(
      <EdgeContextMenu {...defaultProps} currentSyncAsync="sync" />,
    )

    const toggle = screen.getByTestId('sync-async-toggle')
    expect(toggle).toHaveTextContent('Sync')
  })

  it('shows async text when async', () => {
    render(
      <EdgeContextMenu {...defaultProps} currentSyncAsync="async" />,
    )

    const toggle = screen.getByTestId('sync-async-toggle')
    expect(toggle).toHaveTextContent('Async')
  })

  it('calls onToggleSyncAsync with edge ID', () => {
    const onToggleSyncAsync = vi.fn()
    render(
      <EdgeContextMenu {...defaultProps} onToggleSyncAsync={onToggleSyncAsync} />,
    )

    fireEvent.click(screen.getByTestId('sync-async-toggle'))
    expect(onToggleSyncAsync).toHaveBeenCalledWith('edge-1')
  })
})

describe('EdgeContextMenu close behavior', () => {
  it('calls onClose on Escape key', () => {
    const onClose = vi.fn()
    render(
      <EdgeContextMenu {...defaultProps} onClose={onClose} />,
    )

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose on click outside', () => {
    const onClose = vi.fn()
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <EdgeContextMenu {...defaultProps} onClose={onClose} />
      </div>,
    )

    fireEvent.mouseDown(screen.getByTestId('outside'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not call onClose on click inside menu', () => {
    const onClose = vi.fn()
    render(
      <EdgeContextMenu {...defaultProps} onClose={onClose} />,
    )

    fireEvent.mouseDown(screen.getByTestId('edge-context-menu'))
    expect(onClose).not.toHaveBeenCalled()
  })
})
