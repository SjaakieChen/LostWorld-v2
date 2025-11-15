import { useState } from 'react'
import { usePlayerUI } from '../../context/PlayerUIContext'
import { getRarityColor } from '../../utils'
import EntityModal from '../common/EntityModal'

const Inventory = () => {
  const {
    inventorySlots,
    startDrag,
    moveItem,
    swapItems,
    draggedItem,
    selectedEntity,
    setSelectedEntity,
    getItemInSlot,
    inspectItem,
    clearInspection,
    inspectedItem,
  } = usePlayerUI()
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
          const isInspected = item ? inspectedItem?.id === item.id : false
          const isDraggedFromSlot =
            draggedItem?.source.type === 'inventory' && draggedItem?.source.slotId === slotId
          const isDragTarget = dragOverSlot === slotId

          const borderClass = isDragTarget
            ? 'border-blue-500 bg-blue-900/30'
            : isInspected
              ? 'border-yellow-400 bg-yellow-900/30'
              : 'border-gray-600'
          return (
            <div
              key={slotId}
              className={`aspect-square bg-gray-800 rounded border-2 transition-all flex flex-col items-center justify-center p-1 ${
                item
                  ? 'cursor-grab active:cursor-grabbing hover:bg-gray-750'
                  : 'border-dashed opacity-50'
              } ${borderClass} ${isDraggedFromSlot ? 'opacity-50' : ''}`}
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
                  {item.image_url ? (
                    <img 
                      src={item.image_url} 
                      alt={item.name}
                      className="w-10 h-10 object-cover rounded mb-1"
                    />
                  ) : (
                    <div className={`w-10 h-10 ${getRarityColor(item.rarity)} rounded mb-1`}></div>
                  )}
                  <span className="text-xs text-center">{item.name}</span>
                  <button
                    onClick={(event) => {
                      event.stopPropagation()
                      if (isInspected) {
                        clearInspection()
                      } else {
                        inspectItem(item)
                      }
                    }}
                    className={`mt-1 w-full px-2 py-1 text-xs font-semibold rounded transition-colors ${
                      isInspected
                        ? 'bg-yellow-500 text-black hover:bg-yellow-400'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isInspected ? 'Stop Inspecting' : 'Inspect'}
                  </button>
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

