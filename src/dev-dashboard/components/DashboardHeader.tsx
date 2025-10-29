import type { ReactNode } from 'react'

interface DashboardHeaderProps {
  lastUpdate: number
  connectionStatus: 'connected' | 'disconnected'
  entityStorage: any
  gameState: any
  onSync?: () => void
}

export function DashboardHeader({ 
  lastUpdate, 
  connectionStatus, 
  entityStorage,
  gameState,
  onSync
}: DashboardHeaderProps) {
  const getRelativeTime = (timestamp: number) => {
    if (timestamp === 0) return 'Never'
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    if (seconds < 5) return 'Just now'
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ago`
  }

  const counts = entityStorage?.counts || {
    items: 0,
    npcs: 0,
    locations: 0,
    regions: 0
  }

  const gameStateLabel = gameState?.gameState || 'not_started'

  return (
    <header className="dashboard-header">
      <div className="dashboard-header-content">
        <h1>Lost World - Dev Dashboard</h1>
        
        <div className="dashboard-header-stats">
          <div className="stat-item">
            <span className="stat-label">Connection:</span>
            <span className={`stat-value connection-${connectionStatus}`}>
              {connectionStatus === 'connected' ? '● Connected' : '○ Disconnected'}
            </span>
          </div>
          
          <div className="stat-item">
            <span className="stat-label">Last Update:</span>
            <span className="stat-value">{getRelativeTime(lastUpdate)}</span>
          </div>

          <div className="stat-item">
            <span className="stat-label">Game State:</span>
            <span className={`stat-value state-${gameStateLabel}`}>
              {gameStateLabel}
            </span>
          </div>

          {onSync && (
            <div className="stat-item">
              <button
                onClick={onSync}
                className="sync-button"
                title="Request full state sync from game"
              >
                🔄 Sync
              </button>
            </div>
          )}
        </div>

        <div className="dashboard-header-counts">
          <div className="count-item">
            <span className="count-value">{counts.items}</span>
            <span className="count-label">Items</span>
          </div>
          <div className="count-item">
            <span className="count-value">{counts.npcs}</span>
            <span className="count-label">NPCs</span>
          </div>
          <div className="count-item">
            <span className="count-value">{counts.locations}</span>
            <span className="count-label">Locations</span>
          </div>
          <div className="count-item">
            <span className="count-value">{counts.regions}</span>
            <span className="count-label">Regions</span>
          </div>
        </div>
      </div>
    </header>
  )
}

