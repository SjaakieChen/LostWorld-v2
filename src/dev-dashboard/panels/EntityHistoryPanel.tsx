import { useState } from 'react'

interface EntityHistoryPanelProps {
  history: Array<{
    entityId: string
    entityType: string
    timestamp: number
    previousState: any
    newState: any
    changeSource: string
    reason?: string
  }>
  onEntityClick: (entity: any, entityType: string) => void
}

export function EntityHistoryPanel({ history, onEntityClick }: EntityHistoryPanelProps) {
  const [filterType, setFilterType] = useState<string>('all')
  const [filterSource, setFilterSource] = useState<string>('all')

  const filteredHistory = history.filter(entry => {
    if (filterType !== 'all' && entry.entityType !== filterType) return false
    if (filterSource !== 'all' && entry.changeSource !== filterSource) return false
    return true
  })

  const getChangeSummary = (entry: EntityHistoryPanelProps['history'][0]) => {
    if (!entry.previousState && entry.newState) {
      return 'Entity created'
    }
    if (entry.previousState && !entry.newState) {
      return 'Entity removed'
    }
    
    // Location change
    if (entry.previousState?.region !== entry.newState?.region ||
        entry.previousState?.x !== entry.newState?.x ||
        entry.previousState?.y !== entry.newState?.y) {
      const oldLoc = `${entry.previousState?.region} (${entry.previousState?.x}, ${entry.previousState?.y})`
      const newLoc = `${entry.newState?.region} (${entry.newState?.x}, ${entry.newState?.y})`
      return `Location: ${oldLoc} → ${newLoc}`
    }

    // Attribute changes
    const oldAttrs = entry.previousState?.own_attributes || {}
    const newAttrs = entry.newState?.own_attributes || {}
    const attrChanges = Object.keys({ ...oldAttrs, ...newAttrs }).filter(key => {
      return JSON.stringify(oldAttrs[key]) !== JSON.stringify(newAttrs[key])
    })
    
    if (attrChanges.length > 0) {
      return `Attributes changed: ${attrChanges.join(', ')}`
    }

    return 'Entity updated'
  }

  const entityTypes = ['all', 'item', 'npc', 'location', 'region']
  const changeSources = ['all', 'player_action', 'orchestrator', 'system', 'manual']

  return (
    <div className="entity-history-panel">
      <h2>📜 Entity History ({history.length})</h2>

      <div className="panel-section">
        <div className="history-filters">
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            className="filter-select"
          >
            {entityTypes.map(type => (
              <option key={type} value={type}>
                {type === 'all' ? 'All Types' : type}
              </option>
            ))}
          </select>

          <select 
            value={filterSource} 
            onChange={(e) => setFilterSource(e.target.value)}
            className="filter-select"
          >
            {changeSources.map(source => (
              <option key={source} value={source}>
                {source === 'all' ? 'All Sources' : source}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="panel-section">
        <div className="history-timeline">
          {filteredHistory.length === 0 ? (
            <p className="no-data">No history matching filters</p>
          ) : (
            filteredHistory.slice().reverse().map((entry, idx) => {
              // Try to get entity from newState or previousState
              const entity = entry.newState || entry.previousState
              if (!entity) return null

              return (
                <div key={idx} className="history-entry">
                  <div className="history-entry-header">
                    <span className="history-time">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                    <span className={`history-entity-type type-${entry.entityType}`}>
                      {entry.entityType}
                    </span>
                    <span className={`history-source source-${entry.changeSource}`}>
                      {entry.changeSource}
                    </span>
                  </div>
                  <div 
                    className="history-entity-link"
                    onClick={() => onEntityClick(entity, entry.entityType)}
                  >
                    {entity.name || entry.entityId}
                  </div>
                  <div className="history-change-summary">
                    {getChangeSummary(entry)}
                  </div>
                  {entry.reason && (
                    <div className="history-reason">
                      <strong>Reason:</strong> {entry.reason}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

