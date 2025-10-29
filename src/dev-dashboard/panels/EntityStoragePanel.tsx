import { useState } from 'react'

interface EntityStoragePanelProps {
  data: any
  onEntityClick: (entity: any, entityType: string) => void
}

export function EntityStoragePanel({ data, onEntityClick }: EntityStoragePanelProps) {
  const [selectedTab, setSelectedTab] = useState<'items' | 'npcs' | 'locations' | 'regions'>('items')

  const counts = data?.counts || {
    items: 0,
    npcs: 0,
    locations: 0,
    regions: 0
  }

  const allItems = data?.allItems || []
  const allNPCs = data?.allNPCs || []
  const allLocations = data?.allLocations || []
  const allRegions = data?.allRegions || []

  const getCurrentEntities = () => {
    switch (selectedTab) {
      case 'items': return allItems
      case 'npcs': return allNPCs
      case 'locations': return allLocations
      case 'regions': return allRegions
    }
  }

  const currentEntities = getCurrentEntities()

  return (
    <div className="entity-storage-panel">
      <h2>📦 Entity Storage</h2>

      <div className="panel-section">
        <div className="entity-counts">
          <div className="count-card" onClick={() => setSelectedTab('items')}>
            <div className="count-number">{counts.items}</div>
            <div className="count-label">Items</div>
          </div>
          <div className="count-card" onClick={() => setSelectedTab('npcs')}>
            <div className="count-number">{counts.npcs}</div>
            <div className="count-label">NPCs</div>
          </div>
          <div className="count-card" onClick={() => setSelectedTab('locations')}>
            <div className="count-number">{counts.locations}</div>
            <div className="count-label">Locations</div>
          </div>
          <div className="count-card" onClick={() => setSelectedTab('regions')}>
            <div className="count-number">{counts.regions}</div>
            <div className="count-label">Regions</div>
          </div>
        </div>
      </div>

      <div className="panel-section">
        <div className="entity-tabs">
          <button 
            className={selectedTab === 'items' ? 'active' : ''}
            onClick={() => setSelectedTab('items')}
          >
            Items ({counts.items})
          </button>
          <button 
            className={selectedTab === 'npcs' ? 'active' : ''}
            onClick={() => setSelectedTab('npcs')}
          >
            NPCs ({counts.npcs})
          </button>
          <button 
            className={selectedTab === 'locations' ? 'active' : ''}
            onClick={() => setSelectedTab('locations')}
          >
            Locations ({counts.locations})
          </button>
          <button 
            className={selectedTab === 'regions' ? 'active' : ''}
            onClick={() => setSelectedTab('regions')}
          >
            Regions ({counts.regions})
          </button>
        </div>

        <div className="entity-list">
          {currentEntities.length === 0 ? (
            <p className="no-data">No {selectedTab} available</p>
          ) : (
            currentEntities.map((entity: any) => (
              <div 
                key={entity.id} 
                className="entity-card"
                onClick={() => onEntityClick(entity, selectedTab.slice(0, -1))}
              >
                <div className="entity-card-header">
                  <span className="entity-name">{entity.name || entity.id}</span>
                  {entity.category && (
                    <span className="entity-category">{entity.category}</span>
                  )}
                </div>
                <div className="entity-card-info">
                  {selectedTab === 'regions' || entity.regionX !== undefined ? (
                    // Region display: show ID and region coordinates
                    <span className="entity-location">
                      ID: {entity.id} | ({entity.regionX}, {entity.regionY})
                    </span>
                  ) : (
                    // Other entities display: show region and local coordinates
                    <span className="entity-location">
                      {entity.region} ({entity.x}, {entity.y})
                    </span>
                  )}
                </div>
                {entity.own_attributes && Object.keys(entity.own_attributes).length > 0 && (
                  <div className="entity-attributes-preview">
                    {Object.keys(entity.own_attributes).slice(0, 3).map((key: string) => (
                      <span key={key} className="attr-preview">
                        {key}: {String(entity.own_attributes[key].value)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

