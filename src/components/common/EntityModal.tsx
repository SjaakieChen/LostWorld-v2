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
    // NPC has chatHistory (unique to NPC)
    if ('chatHistory' in entity) return 'NPC'
    // Location has purpose but no chatHistory
    if ('purpose' in entity) return 'Location'
    // Otherwise it's an Item
    return 'Item'
  }

  const entityType = getEntityType()

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-lg max-w-[84rem] w-full mx-4 border-2 border-gray-600 flex flex-row aspect-[2/1]"
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
               entityType === 'Location' ? '📍' :
               '📦'}
            </div>
          )}
        </div>

        {/* Right Column - Content */}
        <div className="w-1/2 aspect-square pl-6 pr-6 pt-6 pb-6 overflow-y-auto">
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

          {/* Visual Description */}
          {entity.visualDescription && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2 text-gray-300">Visual Description</h3>
              <p className="text-gray-400 leading-relaxed">{entity.visualDescription}</p>
            </div>
          )}
          {/* Functional Description */}
          {entity.functionalDescription && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2 text-gray-300">Functional Description</h3>
              <p className="text-gray-400 leading-relaxed">{entity.functionalDescription}</p>
            </div>
          )}

          {/* Attributes */}
          {entity.own_attributes && Object.keys(entity.own_attributes).length > 0 && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2 text-gray-300">Attributes</h3>
              <div className="bg-gray-900 rounded p-3 space-y-2">
                {Object.entries(entity.own_attributes).map(([key, attr]) => (
                  <div key={key} className="flex flex-col text-sm">
                    <div className="flex justify-between items-start">
                      <span className="text-gray-400 capitalize font-medium">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                      <span className="text-gray-200 font-mono">
                        {typeof attr === 'object' && 'value' in attr ? String(attr.value) : String(attr)}
                      </span>
                    </div>
                    {typeof attr === 'object' && 'description' in attr && attr.description && (
                      <span className="text-gray-500 text-xs mt-1">{attr.description}</span>
                    )}
                    {typeof attr === 'object' && 'reference' in attr && attr.reference && (
                      <span className="text-gray-600 text-xs mt-1 italic">Reference: {attr.reference}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Additional Info by Entity Type */}
          {entityType === 'Item' && 'category' in entity && entity.category && (
            <div className="text-sm text-gray-400 mb-4">
              Category: <span className="text-gray-200">{entity.category}</span>
            </div>
          )}
          
          {entityType === 'NPC' && 'purpose' in entity && (entity as NPC).purpose && (
            <div className="text-sm text-gray-400 mb-4">
              Purpose: <span className="text-gray-200">{(entity as NPC).purpose}</span>
            </div>
          )}

          {entityType === 'Location' && 'purpose' in entity && (entity as Location).purpose && (
            <div className="text-sm text-gray-400 mb-4">
              Purpose: <span className="text-gray-200">{(entity as Location).purpose}</span>
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

