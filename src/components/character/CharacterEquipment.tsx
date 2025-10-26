import { useState } from 'react'
import { usePlayerUI } from '../../context/PlayerUIContext'
import { useGameState } from '../../context/GameStateContext'
import { getRarityColor } from '../../utils'
import EntityModal from '../common/EntityModal'

const CharacterEquipment = () => {
  const { equipmentSlots, startDrag, moveItem, swapItems, draggedItem, selectedEntity, setSelectedEntity, getItemInSlot } = usePlayerUI()
  const { generatedData } = useGameState()
  const playerImage = generatedData.player?.image_url || ''
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null)

  const slots = [
    { id: 'head', label: 'Head', top: '10%', left: '50%' },
    { id: 'chest', label: 'Chest', top: '35%', left: '50%' },
    { id: 'legs', label: 'Legs', top: '62%', left: '50%' },
    { id: 'feet', label: 'Feet', top: '85%', left: '50%' },
    { id: 'leftHand', label: 'L Hand', top: '40%', left: '15%' },
    { id: 'rightHand', label: 'R Hand', top: '40%', left: '85%' },
  ]

  const handleDragStart = (e: React.DragEvent, item: any, slotId: string) => {
    startDrag(item, { type: 'equipment', slotId })
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, slotId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverSlot(slotId)
  }

  const handleDragLeave = () => {
    setDragOverSlot(null)
  }

  const handleDrop = (e: React.DragEvent, slotId: string) => {
    e.preventDefault()
    setDragOverSlot(null)

    if (!draggedItem) return

    const targetItemId = equipmentSlots[slotId]

    if (targetItemId) {
      // Swap with existing item
      swapItems({ type: 'equipment', slotId })
    } else {
      // Move to empty slot
      moveItem({ type: 'equipment', slotId })
    }
  }

  return (
    <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
      <h2 className="text-xl font-bold mb-4 text-center">Equipment</h2>
      <div className="relative bg-gray-800 rounded-lg aspect-square border border-gray-600">
        {/* Player image or silhouette */}
        <div className="absolute inset-0">
          {playerImage ? (
            <img 
              src={playerImage} 
              alt="Player Character"
              className="w-full h-full object-cover rounded-lg opacity-70"
            />
          ) : (
            <div className="w-full h-full bg-gray-900 rounded-lg opacity-30 flex items-center justify-center">
              <div className="w-32 h-64 bg-gray-700 rounded-full opacity-50"></div>
            </div>
          )}
        </div>
        
        {/* Equipment slots */}
        {slots.map((slot) => {
          const itemId = equipmentSlots[slot.id]
          const item = itemId ? getItemInSlot(slot.id) : null
          const isDraggedFrom =
            draggedItem?.source.type === 'equipment' &&
            draggedItem?.source.slotId === slot.id
          const isDraggedOver = dragOverSlot === slot.id

          return (
            <div
              key={slot.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2"
              style={{ top: slot.top, left: slot.left }}
            >
              <div
                className={`w-20 h-20 rounded border-2 flex flex-col items-center justify-center text-xs transition-all ${
                  item
                    ? 'bg-gray-700 cursor-grab active:cursor-grabbing'
                    : 'bg-transparent border-dashed'
                } ${
                  isDraggedOver
                    ? 'border-blue-500 bg-blue-900/30'
                    : 'border-gray-500'
                } ${
                  isDraggedFrom ? 'opacity-50' : ''
                } hover:bg-gray-700/50`}
                draggable={!!item}
                onDragStart={(e) => item && handleDragStart(e, item, slot.id)}
                onDragOver={(e) => handleDragOver(e, slot.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, slot.id)}
                onDoubleClick={() => item && setSelectedEntity(item)}
                title={item ? `${item.name} (double-click for details)` : slot.label}
              >
                {item ? (
                  <>
                    {item.image_url ? (
                      <img 
                        src={item.image_url} 
                        alt={item.name}
                        className="w-12 h-12 object-cover rounded mb-1"
                      />
                    ) : (
                      <div className={`w-12 h-12 ${getRarityColor(item.rarity)} rounded mb-1`}></div>
                    )}
                    <span className="text-center">{item.name}</span>
                  </>
                ) : (
                  <span className="text-gray-500">{slot.label}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Entity Detail Modal */}
      <EntityModal entity={selectedEntity} onClose={() => setSelectedEntity(null)} />
    </div>
  )
}

export default CharacterEquipment

