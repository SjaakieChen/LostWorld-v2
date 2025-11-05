import type { Item, NPC, Location } from '../../types'
import { getRarityColor } from '../../utils'

interface EntityModalProps {
  entity: Item | NPC | Location | null
  onClose: () => void
}

const EntityModal = ({ entity, onClose }: EntityModalProps) => {
  if (!entity) return null

  // Determine entity type for display purposes
  const getEntityType = () => {
    if ('category' in entity) return 'Item'
    if ('chatHistory' in entity) return 'NPC'
    if ('type' in entity) return 'Location'
    return 'Entity'
  }

  const entityType = getEntityType()

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-lg max-w-4xl w-full mx-4 border-2 border-gray-600 flex flex-row max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Column - Image */}
        <div className={`w-1/2 aspect-square ${getRarityColor(entity.rarity)} rounded-l-lg flex items-center justify-center flex-shrink-0`}>
          {entity.image_url ? (
            <img 
              src={entity.image_url} 
              alt={entity.name}
              className="w-full h-full object-cover rounded-l-lg"
            />
          ) : (
            <div className="text-6xl">
              {entityType === 'NPC' ? '👤' : 
               entityType === 'Location' ? (entity as Location).properties?.emoji || '📍' :
               '📦'}
            </div>
          )}
        </div>

        {/* Right Column - Content */}
        <div className="w-1/2 pl-6 pr-6 pt-6 pb-6 overflow-y-auto">
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="text-sm text-gray-400 mb-1">{entityType}</div>
              <h2 className="text-2xl font-bold">{entity.name}</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl leading-none"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Rarity Badge */}
          <div className="mb-4">
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getRarityColor(entity.rarity)}`}>
              {entity.rarity.charAt(0).toUpperCase() + entity.rarity.slice(1)}
            </span>
          </div>

          {/* Description */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2 text-gray-300">Description</h3>
            <p className="text-gray-400 leading-relaxed">{entity.description}</p>
          </div>

          {/* Properties */}
          {entity.properties && Object.keys(entity.properties).length > 0 && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2 text-gray-300">Properties</h3>
              <div className="bg-gray-900 rounded p-3 space-y-1">
                {Object.entries(entity.properties).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                    <span className="text-gray-200 font-mono">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Additional Info by Entity Type */}
          {entityType === 'Item' && 'category' in entity && (
            <div className="text-sm text-gray-400 mb-4">
              Category: <span className="text-gray-200">{entity.category}</span>
            </div>
          )}
          
          {entityType === 'NPC' && 'role' in entity && entity.role && (
            <div className="text-sm text-gray-400 mb-4">
              Role: <span className="text-gray-200">{entity.role}</span>
            </div>
          )}

          {entityType === 'Location' && 'type' in entity && entity.type && (
            <div className="text-sm text-gray-400 mb-4">
              Type: <span className="text-gray-200">{entity.type}</span>
            </div>
          )}

          {/* Location Info */}
          <div className="mt-4 pt-4 border-t border-gray-700 text-xs text-gray-500">
            Position: ({entity.x}, {entity.y}) | Region: {entity.region}
          </div>
        </div>
      </div>
    </div>
  )
}

export default EntityModal

