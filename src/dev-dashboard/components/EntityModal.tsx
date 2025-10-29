import type { ReactNode } from 'react'

interface EntityModalProps {
  entity: any
  entityType: string
  entityHistory: any[]
  onClose: () => void
}

export function EntityModal({ entity, entityType, entityHistory, onClose }: EntityModalProps) {
  if (!entity) return null

  // Handle ESC key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const attributes = entity.own_attributes || {}
  const historyCount = entityHistory.length
  const lastChange = entityHistory.length > 0 
    ? new Date(entityHistory[entityHistory.length - 1].timestamp).toLocaleString()
    : 'Never'

  return (
    <div 
      className="modal-overlay" 
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="modal-container" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{entity.name || entity.id}</h2>
          <span className="entity-type-badge">{entityType}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          {/* Image Section */}
          {entity.image_url && (
            <div className="modal-image-section">
              <img 
                src={entity.image_url} 
                alt={entity.name}
                className="modal-entity-image"
              />
            </div>
          )}

          {/* Description Section */}
          {entity.description && (
            <div className="modal-section">
              <h3>Description</h3>
              <p className="modal-description">{entity.description}</p>
            </div>
          )}

          {/* Metadata Section */}
          <div className="modal-section">
            <h3>Metadata</h3>
            <div className="modal-metadata">
              <div className="metadata-item">
                <span className="metadata-label">ID:</span>
                <span className="metadata-value">{entity.id}</span>
              </div>
              {entity.category && (
                <div className="metadata-item">
                  <span className="metadata-label">Category:</span>
                  <span className="metadata-value">{entity.category}</span>
                </div>
              )}
              {entity.rarity && (
                <div className="metadata-item">
                  <span className="metadata-label">Rarity:</span>
                  <span className="metadata-value">{entity.rarity}</span>
                </div>
              )}
              <div className="metadata-item">
                <span className="metadata-label">Location:</span>
                <span className="metadata-value">
                  {entity.region} ({entity.x}, {entity.y})
                </span>
              </div>
            </div>
          </div>

          {/* Attributes Section */}
          {Object.keys(attributes).length > 0 && (
            <div className="modal-section">
              <h3>Attributes</h3>
              <table className="attributes-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Value</th>
                    <th>Type</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(attributes).map(([name, attr]: [string, any]) => (
                    <tr key={name}>
                      <td className="attr-name">{name}</td>
                      <td className="attr-value">{String(attr.value)}</td>
                      <td className="attr-type">{attr.type}</td>
                      <td className="attr-description">{attr.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* History Summary */}
          <div className="modal-section">
            <h3>Change History</h3>
            <div className="modal-history-summary">
              <div className="history-stat">
                <span className="history-stat-label">Total Changes:</span>
                <span className="history-stat-value">{historyCount}</span>
              </div>
              <div className="history-stat">
                <span className="history-stat-label">Last Changed:</span>
                <span className="history-stat-value">{lastChange}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

