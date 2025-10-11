import { useState } from 'react'
import { useGame } from '../../context/GameContext'
import { getRarityColor } from '../../utils'

const CharacterEquipment = () => {
  const { equipmentSlots, startDrag, moveItem, swapItems, draggedItem } = useGame()
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

    const targetItem = equipmentSlots[slotId]

    if (targetItem) {
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
      <div className="relative bg-gray-800 rounded-lg h-96 border border-gray-600">
        {/* Body silhouette placeholder */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-32 h-64 bg-gray-900 rounded-full opacity-30"></div>
        </div>
        
        {/* Equipment slots */}
        {slots.map((slot) => {
          const item = equipmentSlots[slot.id]
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
              >
                {item ? (
                  <>
                    <div className={`w-12 h-12 ${getRarityColor(item.rarity)} rounded mb-1`}></div>
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
    </div>
  )
}

export default CharacterEquipment

