import { useState } from 'react'
import { useGame } from '../../context/GameContext'
import { getRarityColor } from '../../utils'
import EntityModal from '../common/EntityModal'

const InteractionPanel = () => {
  const {
    interactionInputSlots,
    interactionOutputSlots,
    startDrag,
    moveItem,
    swapItems,
    draggedItem,
    selectedEntity,
    setSelectedEntity,
  } = useGame()

  const [dragOverInputSlot, setDragOverInputSlot] = useState<string | null>(null)
  const [dragOverOutputSlot, setDragOverOutputSlot] = useState<string | null>(null)

  // Input handlers
  const handleInputDragStart = (e: React.DragEvent, item: any, slotId: string) => {
    startDrag(item, { type: 'interaction-input', slotId })
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleInputDragOver = (e: React.DragEvent, slotId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverInputSlot(slotId)
  }

  const handleInputDragLeave = () => {
    setDragOverInputSlot(null)
  }

  const handleInputDrop = (e: React.DragEvent, slotId: string) => {
    e.preventDefault()
    setDragOverInputSlot(null)

    if (!draggedItem) return

    const targetItem = interactionInputSlots[slotId]

    if (targetItem) {
      swapItems({ type: 'interaction-input', slotId })
    } else {
      moveItem({ type: 'interaction-input', slotId })
    }
  }

  // Output handlers
  const handleOutputDragStart = (e: React.DragEvent, item: any, slotId: string) => {
    startDrag(item, { type: 'interaction-output', slotId })
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleOutputDragOver = (e: React.DragEvent, slotId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverOutputSlot(slotId)
  }

  const handleOutputDragLeave = () => {
    setDragOverOutputSlot(null)
  }

  const handleOutputDrop = (e: React.DragEvent, _slotId: string) => {
    e.preventDefault()
    setDragOverOutputSlot(null)
    // Output slots are generally for display only, but we allow dragging from them
  }

  return (
    <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
      <h2 className="text-xl font-bold mb-4">Interaction</h2>
      
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-600">
        <div className="mb-4">
          <h3 className="text-sm font-semibold mb-2 text-gray-400">Input</h3>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(interactionInputSlots).map(([slotId, item]) => {
              const isDraggedFrom =
                draggedItem?.source.type === 'interaction-input' &&
                draggedItem?.source.slotId === slotId
              const isDraggedOver = dragOverInputSlot === slotId

              return (
                <div
                  key={slotId}
                  className={`aspect-square rounded border-2 flex flex-col items-center justify-center p-1 transition-all ${
                    item
                      ? 'bg-gray-900 cursor-grab active:cursor-grabbing'
                      : 'bg-gray-900 border-dashed'
                  } ${
                    isDraggedOver
                      ? 'border-blue-500 bg-blue-900/30'
                      : 'border-gray-600'
                  } ${
                    isDraggedFrom ? 'opacity-50' : ''
                  } hover:border-gray-500`}
                  draggable={!!item}
                  onDragStart={(e) => item && handleInputDragStart(e, item, slotId)}
                  onDragOver={(e) => handleInputDragOver(e, slotId)}
                  onDragLeave={handleInputDragLeave}
                  onDrop={(e) => handleInputDrop(e, slotId)}
                  onDoubleClick={() => item && setSelectedEntity(item)}
                  title={item ? `${item.name} (double-click for details)` : 'Input slot'}
                >
                  {item ? (
                    <>
                      <div className={`w-8 h-8 ${getRarityColor(item.rarity)} rounded mb-1`}></div>
                      <span className="text-xs text-center">{item.name}</span>
                    </>
                  ) : (
                    <span className="text-gray-500">+</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex justify-center mb-4">
          <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-semibold transition-colors">
            Craft / Use
          </button>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2 text-gray-400">Output</h3>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(interactionOutputSlots).map(([slotId, item]) => {
              const isDraggedFrom =
                draggedItem?.source.type === 'interaction-output' &&
                draggedItem?.source.slotId === slotId
              const isDraggedOver = dragOverOutputSlot === slotId

              return (
                <div
                  key={slotId}
                  className={`aspect-square bg-gray-900 rounded border flex flex-col items-center justify-center p-1 transition-all ${
                    item ? 'cursor-grab active:cursor-grabbing' : ''
                  } ${
                    isDraggedOver ? 'border-blue-500' : 'border-gray-600'
                  } ${isDraggedFrom ? 'opacity-50' : ''}`}
                  draggable={!!item}
                  onDragStart={(e) => item && handleOutputDragStart(e, item, slotId)}
                  onDragOver={(e) => handleOutputDragOver(e, slotId)}
                  onDragLeave={handleOutputDragLeave}
                  onDrop={(e) => handleOutputDrop(e, slotId)}
                  onDoubleClick={() => item && setSelectedEntity(item)}
                  title={item ? `${item.name} (double-click for details)` : 'Output slot'}
                >
                  {item ? (
                    <>
                      <div className={`w-8 h-8 ${getRarityColor(item.rarity)} rounded mb-1`}></div>
                      <span className="text-xs text-center">{item.name}</span>
                    </>
                  ) : (
                    <span className="text-gray-600">?</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Entity Detail Modal */}
      <EntityModal entity={selectedEntity} onClose={() => setSelectedEntity(null)} />
    </div>
  )
}

export default InteractionPanel

