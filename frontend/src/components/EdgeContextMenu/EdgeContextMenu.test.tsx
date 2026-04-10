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
})
