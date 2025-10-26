import { usePlayerUI } from '../../context/PlayerUIContext'
import { getRarityColor } from '../../utils'
import EntityModal from '../common/EntityModal'

const Interactables = () => {
  const { npcs, interactableItems, activeNPC, toggleNPC, takeItem, selectedEntity, setSelectedEntity } = usePlayerUI()

  return (
    <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
      <h2 className="text-xl font-bold mb-4">Interactables</h2>
      
      <div className="mb-4">
        <h3 className="text-sm font-semibold mb-2 text-gray-400">NPCs</h3>
        <div className="space-y-2">
          {npcs.map((npc) => {
            const isTalking = activeNPC?.id === npc.id
            
            return (
              <div
                key={npc.id}
                className="flex items-center gap-3 bg-gray-800 rounded p-2 border border-gray-600"
              >
                <div 
                  className={`w-10 h-10 ${getRarityColor(npc.rarity)} rounded flex items-center justify-center text-2xl cursor-pointer hover:opacity-80 transition-opacity`}
                  onClick={() => setSelectedEntity(npc)}
                  title="View details"
                >
                  👤
                </div>
                <span 
                  className="flex-1 cursor-pointer hover:text-gray-300 transition-colors"
                  onClick={() => setSelectedEntity(npc)}
                  title="View details"
                >
                  {npc.name}
                </span>
                <button
                  onClick={() => toggleNPC(npc)}
                  className={`px-3 py-1 rounded text-sm font-semibold transition-colors ${
                    isTalking
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {isTalking ? 'Stop Talking' : 'Talk'}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2 text-gray-400">Items</h3>
        <div className="grid grid-cols-3 gap-2">
          {interactableItems.map((item) => (
            <div
              key={item.id}
              className="bg-gray-800 rounded border border-gray-600 transition-colors flex flex-col items-center justify-center p-2 gap-1"
            >
              {item.image_url ? (
                <img 
                  src={item.image_url} 
                  alt={item.name}
                  className="w-8 h-8 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setSelectedEntity(item)}
                  title="View details"
                />
              ) : (
                <div 
                  className={`w-8 h-8 ${getRarityColor(item.rarity)} rounded cursor-pointer hover:opacity-80 transition-opacity`}
                  onClick={() => setSelectedEntity(item)}
                  title="View details"
                ></div>
              )}
              <span 
                className="text-xs text-center cursor-pointer hover:text-gray-300 transition-colors"
                onClick={() => setSelectedEntity(item)}
                title="View details"
              >
                {item.name}
              </span>
              <button
                onClick={() => takeItem(item)}
                className="w-full mt-1 px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded font-semibold transition-colors"
              >
                Take
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Entity Detail Modal */}
      <EntityModal entity={selectedEntity} onClose={() => setSelectedEntity(null)} />
    </div>
  )
}

export default Interactables

