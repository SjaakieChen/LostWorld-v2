import { useState } from 'react'
import { useGame } from '../../context/GameContext'
import { getRarityColor } from '../../utils'
import EntityModal from '../common/EntityModal'

const Inventory = () => {
  const { inventorySlots, startDrag, moveItem, swapItems, draggedItem, selectedEntity, setSelectedEntity, getItemInSlot } = useGame()
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null)

  const handleDragStart = (e: React.DragEvent, item: any, slotId: string) => {
    startDrag(item, { type: 'inventory', slotId })
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

    const targetItemId = inventorySlots[slotId]

    if (targetItemId) {
      // Swap with existing item
      swapItems({ type: 'inventory', slotId })
    } else {
      // Move to empty slot
      moveItem({ type: 'inventory', slotId })
    }
  }

  return (
    <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
      <h2 className="text-xl font-bold mb-4">Inventory</h2>
      <div className="grid grid-cols-4 gap-2">
        {Object.entries(inventorySlots).map(([slotId, itemId]) => {
          const item = itemId ? getItemInSlot(slotId) : null
          return (
            <div
              key={slotId}
              className={`aspect-square bg-gray-800 rounded border-2 transition-all flex flex-col items-center justify-center p-1 ${
                item
                  ? 'cursor-grab active:cursor-grabbing hover:bg-gray-750'
                  : 'border-dashed opacity-50'
              } ${
                dragOverSlot === slotId
                  ? 'border-blue-500 bg-blue-900/30'
                  : 'border-gray-600'
              } ${
                draggedItem?.source.type === 'inventory' &&
                draggedItem?.source.slotId === slotId
                  ? 'opacity-50'
                  : ''
              }`}
              draggable={!!item}
              onDragStart={(e) => item && handleDragStart(e, item, slotId)}
              onDragOver={(e) => handleDragOver(e, slotId)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, slotId)}
              onDoubleClick={() => item && setSelectedEntity(item)}
              title={item ? `${item.name} (double-click for details)` : undefined}
            >
              {item ? (
                <>
                  <div className={`w-10 h-10 ${getRarityColor(item.rarity)} rounded mb-1`}></div>
                  <span className="text-xs text-center">{item.name}</span>
                </>
              ) : null}
            </div>
          )
        })}
      </div>

      {/* Entity Detail Modal */}
      <EntityModal entity={selectedEntity} onClose={() => setSelectedEntity(null)} />
    </div>
  )
}

export default Inventory

