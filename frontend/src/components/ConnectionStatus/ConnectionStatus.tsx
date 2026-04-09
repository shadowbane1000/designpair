import type { ConnectionStatus as Status } from '../../hooks/useWebSocket'
import './ConnectionStatus.css'

const statusLabels: Record<Status, string> = {
  connecting: 'Connecting...',
  connected: 'Connected',
  disconnected: 'Disconnected',
  reconnecting: 'Reconnecting...',
}

interface ConnectionStatusProps {
  status: Status
}

export function ConnectionStatus({ status }: ConnectionStatusProps) {
  return (
    <div className={`connection-status connection-status-${status}`} data-testid="connection-status">
      <span className="connection-dot" />
      <span className="connection-label">{statusLabels[status]}</span>
    </div>
  )
}
