interface PlayerUIPanelProps {
  data: any
  onEntityClick: (entity: any, entityType: string) => void
}

export function PlayerUIPanel({ data, onEntityClick }: PlayerUIPanelProps) {
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

  return (
    <div className="player-ui-panel">
      <h2>👤 Player</h2>

      <div className="panel-section">
        <h3>Location</h3>
        {currentLocation ? (
          <div 
            className="clickable-entity"
            onClick={() => onEntityClick(currentLocation, 'location')}
          >
            <div className="entity-link">{currentLocation.name || currentLocation.id}</div>
            <div className="entity-link-details">
              {currentRegion?.name || currentLocation.region} ({currentLocation.x}, {currentLocation.y})
            </div>
          </div>
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

