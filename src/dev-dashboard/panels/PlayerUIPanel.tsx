import { useState, useEffect } from 'react'

interface PlayerUIPanelProps {
  data: any
  onEntityClick: (entity: any, entityType: string) => void
  allLocations?: any[]
  onLocationChange?: (locationId: string) => void
}

export function PlayerUIPanel({ data, onEntityClick, allLocations = [], onLocationChange }: PlayerUIPanelProps) {
  if (!data) {
    return (
      <div className="player-ui-panel">
        <h2>👤 Player</h2>
        <p className="no-data">No player data available</p>
      </div>
    )
  }

  const currentLocation = data.currentLocation
  const currentRegion = data.currentRegion
  const playerStats = data.playerStats || {}
  const playerStatus = data.playerStatus
  const inventorySlots = data.inventorySlots || {}
  const equipmentSlots = data.equipmentSlots || {}

  const inventoryCount = Object.values(inventorySlots).filter(id => id !== null).length
  const equipmentCount = Object.values(equipmentSlots).filter(id => id !== null).length

  const [selectedLocationId, setSelectedLocationId] = useState<string>(currentLocation?.id || '')

  // Sync selected location when current location changes
  useEffect(() => {
    if (currentLocation?.id) {
      setSelectedLocationId(currentLocation.id)
    }
  }, [currentLocation?.id])

  const handleLocationChange = () => {
    if (selectedLocationId && onLocationChange) {
      onLocationChange(selectedLocationId)
    }
  }

  return (
    <div className="player-ui-panel">
      <h2>👤 Player</h2>

      <div className="panel-section">
        <h3>Location</h3>
        {currentLocation ? (
          <>
            <div 
              className="clickable-entity"
              onClick={() => onEntityClick(currentLocation, 'location')}
            >
              <div className="entity-link">{currentLocation.name || currentLocation.id}</div>
              <div className="entity-link-details">
                {currentRegion?.name || currentLocation.region} ({currentLocation.x}, {currentLocation.y})
              </div>
            </div>
            {allLocations.length > 0 && onLocationChange && (
              <div className="location-selector" style={{ marginTop: '12px' }}>
                <label htmlFor="location-select" style={{ display: 'block', marginBottom: '6px', fontSize: '12px' }}>
                  Change Location:
                </label>
                <select
                  id="location-select"
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px',
                    fontSize: '12px',
                    marginBottom: '6px',
                    backgroundColor: '#1a1a1a',
                    color: '#e0e0e0',
                    border: '1px solid #444',
                    borderRadius: '4px'
                  }}
                >
                  {allLocations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name || location.id} ({location.region} - {location.x}, {location.y})
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleLocationChange}
                  disabled={!selectedLocationId || selectedLocationId === currentLocation.id}
                  style={{
                    width: '100%',
                    padding: '6px',
                    fontSize: '12px',
                    backgroundColor: selectedLocationId && selectedLocationId !== currentLocation.id ? '#4a9eff' : '#444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: selectedLocationId && selectedLocationId !== currentLocation.id ? 'pointer' : 'not-allowed'
                  }}
                >
                  Change Location
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="no-data">No location data</p>
        )}
      </div>

      <div className="panel-section">
        <h3>Status</h3>
        {playerStatus ? (
          <div className="status-display">
            <div className="status-bar">
              <div className="status-bar-header">
                <span>Health</span>
                <span>{playerStatus.health}/{playerStatus.maxHealth}</span>
              </div>
              <div className="bar-container">
                <div 
                  className="bar-fill health-bar" 
                  style={{width: `${(playerStatus.health / playerStatus.maxHealth) * 100}%`}}
                ></div>
              </div>
            </div>
            <div className="status-bar">
              <div className="status-bar-header">
                <span>Energy</span>
                <span>{playerStatus.energy}/{playerStatus.maxEnergy}</span>
              </div>
              <div className="bar-container">
                <div 
                  className="bar-fill energy-bar" 
                  style={{width: `${(playerStatus.energy / playerStatus.maxEnergy) * 100}%`}}
                ></div>
              </div>
            </div>
          </div>
        ) : (
          <p className="no-data">No status data</p>
        )}
      </div>

      <div className="panel-section">
        <h3>Stats</h3>
        {Object.keys(playerStats).length === 0 ? (
          <p className="no-data">No stats available</p>
        ) : (
          <div className="stats-list">
            {Object.entries(playerStats).map(([statName, stat]: [string, any]) => (
              <div key={statName} className="stat-item-detailed">
                <div className="stat-header">
                  <span className="stat-name">{statName.charAt(0).toUpperCase() + statName.slice(1).replace(/_/g, ' ')}</span>
                  <span className="stat-value-tier">Value: {stat.value}/100 | Tier {stat.tier}</span>
                </div>
                {stat.tierNames && stat.tierNames.length > 0 && (
                  <div className="stat-tier-names">
                    {stat.tierNames.map((tierName: string, index: number) => (
                      <span 
                        key={index}
                        className={`tier-name ${index + 1 === stat.tier ? 'current-tier' : ''}`}
                      >
                        {index + 1 === stat.tier ? '→ ' : ''}
                        Tier {index + 1}: {tierName}
                        {index + 1 === stat.tier ? ' ←' : ''}
                        {index < stat.tierNames.length - 1 ? ' | ' : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel-section">
        <h3>Character Bio</h3>
        <p className="config-item" style={{ marginBottom: '8px' }}>
          <span className="config-label">Name:</span>
          <span className="config-value">{data.playerName || 'Unknown Adventurer'}</span>
        </p>
        {data.playerDescription && (
          <p style={{ fontSize: '12px', color: '#cbd5f5', whiteSpace: 'pre-line', marginBottom: '6px' }}>
            <span className="config-label" style={{ display: 'block' }}>Player Pitch:</span>
            {data.playerDescription}
          </p>
        )}
        {data.playerBackgroundDescription && (
          <p style={{ fontSize: '12px', color: '#cbd5f5', whiteSpace: 'pre-line', marginBottom: '6px' }}>
            <span className="config-label" style={{ display: 'block' }}>Background:</span>
            {data.playerBackgroundDescription}
          </p>
        )}
        {data.playerVisualDescription && (
          <p style={{ fontSize: '12px', color: '#cbd5f5', whiteSpace: 'pre-line' }}>
            <span className="config-label" style={{ display: 'block' }}>Visual Prompt:</span>
            {data.playerVisualDescription}
          </p>
        )}
      </div>

      <div className="panel-section">
        <h3>Inventory</h3>
        <p>Items: {inventoryCount}/12</p>
        <p>Equipment: {equipmentCount}/6</p>
      </div>

      {data.exploredLocationsCount !== undefined && (
        <div className="panel-section">
          <h3>Exploration</h3>
          <p>Explored Locations: {data.exploredLocationsCount}</p>
        </div>
      )}

      {data.activeNPC && (
        <div className="panel-section">
          <h3>Active NPC</h3>
          <div 
            className="clickable-entity"
            onClick={() => onEntityClick(data.activeNPC, 'npc')}
          >
            <div className="entity-link">{data.activeNPC.name || data.activeNPC.id}</div>
          </div>
        </div>
      )}
    </div>
  )
}

