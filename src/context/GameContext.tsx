import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Item, NPC, DraggedItem } from '../types'
import { STARTING_INVENTORY_ITEMS, WORLD_ITEMS, GAME_NPCS } from '../data'

interface GameContextType {
  // Items state - ALL use semantic Record<string, Item | null> for consistency
  inventorySlots: Record<string, Item | null>
  equipmentSlots: Record<string, Item | null>
  interactionInputSlots: Record<string, Item | null>
  interactionOutputSlots: Record<string, Item | null>
  interactableItems: Item[]  // Items in the world (not yet picked up)
  
  // NPC state
  npcs: NPC[]
  activeNPC: NPC | null  // Store full NPC object for semantic access
  
  // Drag state
  draggedItem: DraggedItem | null
  
  // Functions
  startDrag: (item: Item, source: DraggedItem['source']) => void
  endDrag: () => void
  moveItem: (destination: { type: string; slotId: string }) => void
  swapItems: (destination: { type: string; slotId: string }) => void
  takeItem: (item: Item) => void
  toggleNPC: (npc: NPC) => void
}

const GameContext = createContext<GameContextType | undefined>(undefined)

export const useGame = () => {
  const context = useContext(GameContext)
  if (!context) {
    throw new Error('useGame must be used within GameProvider')
  }
  return context
}

// Helper to initialize inventory slots from items array
const initializeInventorySlots = (items: Item[]): Record<string, Item | null> => {
  const slots: Record<string, Item | null> = {}
  for (let i = 1; i <= 12; i++) {
    const item = items[i - 1] || null
    slots[`inv_slot_${i}`] = item
  }
  return slots
}

export const GameProvider = ({ children }: { children: ReactNode }) => {
  // Initialize inventory with semantic slot names (12 slots total)
  const [inventorySlots, setInventorySlots] = useState<Record<string, Item | null>>(
    initializeInventorySlots(STARTING_INVENTORY_ITEMS)
  )

  // Equipment slots (6 semantic slots)
  const [equipmentSlots, setEquipmentSlots] = useState<Record<string, Item | null>>({
    head: null,
    chest: null,
    legs: null,
    feet: null,
    leftHand: null,
    rightHand: null,
  })

  // Interaction panel input slots (3 semantic slots)
  const [interactionInputSlots, setInteractionInputSlots] = useState<Record<string, Item | null>>({
    input_slot_1: null,
    input_slot_2: null,
    input_slot_3: null,
  })

  // Interaction panel output slots (3 semantic slots)
  const [interactionOutputSlots, setInteractionOutputSlots] = useState<Record<string, Item | null>>({
    output_slot_1: null,
    output_slot_2: null,
    output_slot_3: null,
  })

  // Interactable items (not yet picked up) - initialized from data
  const [interactableItems, setInteractableItems] = useState<Item[]>(WORLD_ITEMS)

  // NPCs - initialized from data
  const [npcs] = useState<NPC[]>(GAME_NPCS)
  const [activeNPC, setActiveNPC] = useState<NPC | null>(null)

  // Drag state
  const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null)

  const startDrag = (item: Item, source: DraggedItem['source']) => {
    setDraggedItem({ item, source })
  }

  const endDrag = () => {
    setDraggedItem(null)
  }

  const moveItem = (destination: { type: string; slotId: string }) => {
    if (!draggedItem) return

    const { item, source } = draggedItem

    // Remove from source using semantic slot ID
    if (source.type === 'inventory') {
      setInventorySlots(prev => ({ ...prev, [source.slotId]: null }))
    } else if (source.type === 'equipment') {
      setEquipmentSlots(prev => ({ ...prev, [source.slotId]: null }))
    } else if (source.type === 'interaction-input') {
      setInteractionInputSlots(prev => ({ ...prev, [source.slotId]: null }))
    } else if (source.type === 'interaction-output') {
      setInteractionOutputSlots(prev => ({ ...prev, [source.slotId]: null }))
    }

    // Add to destination using semantic slot ID
    if (destination.type === 'inventory') {
      setInventorySlots(prev => ({ ...prev, [destination.slotId]: item }))
    } else if (destination.type === 'equipment') {
      setEquipmentSlots(prev => ({ ...prev, [destination.slotId]: item }))
    } else if (destination.type === 'interaction-input') {
      setInteractionInputSlots(prev => ({ ...prev, [destination.slotId]: item }))
    }

    endDrag()
  }

  const swapItems = (destination: { type: string; slotId: string }) => {
    if (!draggedItem) return

    const { item: draggedItemData, source } = draggedItem
    let destinationItem: Item | null = null

    // Get destination item using semantic slot ID
    if (destination.type === 'inventory') {
      destinationItem = inventorySlots[destination.slotId]
    } else if (destination.type === 'equipment') {
      destinationItem = equipmentSlots[destination.slotId]
    } else if (destination.type === 'interaction-input') {
      destinationItem = interactionInputSlots[destination.slotId]
    }

    if (!destinationItem) {
      moveItem(destination)
      return
    }

    // Swap: Put destination item in source, dragged item in destination
    if (source.type === 'inventory') {
      setInventorySlots(prev => ({ ...prev, [source.slotId]: destinationItem }))
    } else if (source.type === 'equipment') {
      setEquipmentSlots(prev => ({ ...prev, [source.slotId]: destinationItem }))
    } else if (source.type === 'interaction-input') {
      setInteractionInputSlots(prev => ({ ...prev, [source.slotId]: destinationItem }))
    } else if (source.type === 'interaction-output') {
      setInteractionOutputSlots(prev => ({ ...prev, [source.slotId]: destinationItem }))
    }

    // Put dragged item in destination
    if (destination.type === 'inventory') {
      setInventorySlots(prev => ({ ...prev, [destination.slotId]: draggedItemData }))
    } else if (destination.type === 'equipment') {
      setEquipmentSlots(prev => ({ ...prev, [destination.slotId]: draggedItemData }))
    } else if (destination.type === 'interaction-input') {
      setInteractionInputSlots(prev => ({ ...prev, [destination.slotId]: draggedItemData }))
    }

    endDrag()
  }

  const takeItem = (item: Item) => {
    // Find first empty inventory slot using semantic slot names
    const emptySlotEntry = Object.entries(inventorySlots).find(([_, slotItem]) => slotItem === null)
    
    if (!emptySlotEntry) {
      console.warn('Inventory is full!')
      return
    }

    const [emptySlotId] = emptySlotEntry

    // Add to inventory
    setInventorySlots(prev => ({ ...prev, [emptySlotId]: item }))

    // Remove from interactables
    setInteractableItems(prev => prev.filter(i => i.id !== item.id))
  }

  const toggleNPC = (npc: NPC) => {
    setActiveNPC(prev => (prev?.id === npc.id ? null : npc))
  }

  return (
    <GameContext.Provider
      value={{
        inventorySlots,
        equipmentSlots,
        interactionInputSlots,
        interactionOutputSlots,
        interactableItems,
        npcs,
        activeNPC,
        draggedItem,
        startDrag,
        endDrag,
        moveItem,
        swapItems,
        takeItem,
        toggleNPC,
      }}
    >
      {children}
    </GameContext.Provider>
  )
}

