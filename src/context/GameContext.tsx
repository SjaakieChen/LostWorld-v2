import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Item, NPC, DraggedItem, Location, Region, ChatMessage } from '../types'
import { 
  STARTING_INVENTORY_ITEMS, 
  GAME_REGIONS,
  STARTING_LOCATION_ID 
} from '../data'
import { useGameMemory } from './GameMemoryContext'

interface GameContextType {
  // Items state - ALL use semantic Record<string, string | null> for item IDs
  inventorySlots: Record<string, string | null>
  equipmentSlots: Record<string, string | null>
  interactionInputSlots: Record<string, string | null>
  interactionOutputSlots: Record<string, string | null>
  interactableItems: Item[]  // Items in the world (not yet picked up) - from GameMemory
  
  // NPC state
  npcs: NPC[]  // All NPCs - from GameMemory
  activeNPC: NPC | null  // Store full NPC object for semantic access
  
  // Modal state
  selectedEntity: Item | NPC | Location | null
  setSelectedEntity: (entity: Item | NPC | Location | null) => void
  
  // Spatial state
  currentLocation: Location
  currentRegion: Region
  allRegions: Region[]
  exploredLocations: Set<string>  // Track discovered location IDs
  
  // Drag state
  draggedItem: DraggedItem | null
  
  // Functions
  startDrag: (item: Item, source: DraggedItem['source']) => void
  endDrag: () => void
  moveItem: (destination: { type: string; slotId: string }) => void
  swapItems: (destination: { type: string; slotId: string }) => void
  takeItem: (item: Item) => void
  toggleNPC: (npc: NPC) => void
  addChatMessage: (npcId: string, message: ChatMessage) => void
  moveToLocation: (location: Location) => void
  changeRegion: (direction: 'north' | 'south' | 'east' | 'west') => void
  getLocationAt: (x: number, y: number, region: string) => Location | undefined
  getItemInSlot: (slotId: string) => Item | null
}

const GameContext = createContext<GameContextType | undefined>(undefined)

export const useGame = () => {
  const context = useContext(GameContext)
  if (!context) {
    throw new Error('useGame must be used within GameProvider')
  }
  return context
}

// Helper to initialize inventory slots from items array (returns item IDs)
const initializeInventorySlots = (items: Item[]): Record<string, string | null> => {
  const slots: Record<string, string | null> = {}
  for (let i = 1; i <= 12; i++) {
    const item = items[i - 1] || null
    slots[`inv_slot_${i}`] = item ? item.id : null
  }
  return slots
}

export const GameProvider = ({ children }: { children: ReactNode }) => {
  // GameMemory hook
  const { getEntitiesAt, updateEntity, getAllItemById } = useGameMemory()
  
  // Spatial state - world map and locations
  const [allRegions] = useState<Region[]>(GAME_REGIONS)
  
  // Get current location from GameMemory
  const { locations } = getEntitiesAt('region_medieval_kingdom_001', 0, 0)
  const [currentLocation, setCurrentLocation] = useState<Location>(
    locations.find(loc => loc.id === STARTING_LOCATION_ID) || locations[0]
  )
  const currentRegion = allRegions.find(r => r.id === currentLocation.region) || allRegions[0]
  
  // Exploration tracking - start with current location explored
  const [exploredLocations, setExploredLocations] = useState<Set<string>>(
    new Set([STARTING_LOCATION_ID])
  )

  // Get entities at current location from GameMemory
  const { items: interactableItems, npcs } = getEntitiesAt(
    currentLocation.region,
    currentLocation.x,
    currentLocation.y
  )

  // Initialize inventory with semantic slot names (12 slots total) - now stores item IDs
  const [inventorySlots, setInventorySlots] = useState<Record<string, string | null>>(
    initializeInventorySlots(STARTING_INVENTORY_ITEMS)
  )

  // Equipment slots (6 semantic slots) - now stores item IDs
  const [equipmentSlots, setEquipmentSlots] = useState<Record<string, string | null>>({
    head: null,
    chest: null,
    legs: null,
    feet: null,
    leftHand: null,
    rightHand: null,
  })

  // Interaction panel input slots (3 semantic slots) - now stores item IDs
  const [interactionInputSlots, setInteractionInputSlots] = useState<Record<string, string | null>>({
    input_slot_1: null,
    input_slot_2: null,
    input_slot_3: null,
  })

  // Interaction panel output slots (3 semantic slots) - now stores item IDs
  const [interactionOutputSlots, setInteractionOutputSlots] = useState<Record<string, string | null>>({
    output_slot_1: null,
    output_slot_2: null,
    output_slot_3: null,
  })

  // Active NPC conversation
  const [activeNPC, setActiveNPC] = useState<NPC | null>(null)

  // Selected entity for modal display
  const [selectedEntity, setSelectedEntity] = useState<Item | NPC | Location | null>(null)

  // Drag state
  const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null)

  // Helper to get item from slot ID
  const getItemInSlot = (slotId: string): Item | null => {
    const itemId = inventorySlots[slotId] || equipmentSlots[slotId] || 
                   interactionInputSlots[slotId] || interactionOutputSlots[slotId]
    return itemId ? getAllItemById(itemId) || null : null
  }

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
      setInventorySlots(prev => ({ ...prev, [destination.slotId]: item.id }))
    } else if (destination.type === 'equipment') {
      setEquipmentSlots(prev => ({ ...prev, [destination.slotId]: item.id }))
    } else if (destination.type === 'interaction-input') {
      setInteractionInputSlots(prev => ({ ...prev, [destination.slotId]: item.id }))
    }

    endDrag()
  }

  const swapItems = (destination: { type: string; slotId: string }) => {
    if (!draggedItem) return

    const { item: draggedItemData, source } = draggedItem
    let destinationItemId: string | null = null

    // Get destination item using semantic slot ID
    if (destination.type === 'inventory') {
      destinationItemId = inventorySlots[destination.slotId]
    } else if (destination.type === 'equipment') {
      destinationItemId = equipmentSlots[destination.slotId]
    } else if (destination.type === 'interaction-input') {
      destinationItemId = interactionInputSlots[destination.slotId]
    }

    if (!destinationItemId) {
      moveItem(destination)
      return
    }

    // Swap: Put destination item in source, dragged item in destination
    if (source.type === 'inventory') {
      setInventorySlots(prev => ({ ...prev, [source.slotId]: destinationItemId }))
    } else if (source.type === 'equipment') {
      setEquipmentSlots(prev => ({ ...prev, [source.slotId]: destinationItemId }))
    } else if (source.type === 'interaction-input') {
      setInteractionInputSlots(prev => ({ ...prev, [source.slotId]: destinationItemId }))
    } else if (source.type === 'interaction-output') {
      setInteractionOutputSlots(prev => ({ ...prev, [source.slotId]: destinationItemId }))
    }

    // Put dragged item in destination
    if (destination.type === 'inventory') {
      setInventorySlots(prev => ({ ...prev, [destination.slotId]: draggedItemData.id }))
    } else if (destination.type === 'equipment') {
      setEquipmentSlots(prev => ({ ...prev, [destination.slotId]: draggedItemData.id }))
    } else if (destination.type === 'interaction-input') {
      setInteractionInputSlots(prev => ({ ...prev, [destination.slotId]: draggedItemData.id }))
    }

    endDrag()
  }

  const takeItem = (item: Item) => {
    // Find first empty inventory slot using semantic slot names
    const emptySlotEntry = Object.entries(inventorySlots).find(([_, slotItemId]) => slotItemId === null)
    
    if (!emptySlotEntry) {
      console.warn('Inventory is full!')
      return
    }

    const [emptySlotId] = emptySlotEntry

    // Update item to be in inventory region
    const inventoryItem: Item = {
      ...item,
      x: 0,
      y: 0,
      region: 'inventory'
    }

    // Update in memory (moves to inventory coordinates)
    updateEntity(inventoryItem, 'item')

    // Link to inventory slot
    setInventorySlots(prev => ({ ...prev, [emptySlotId]: inventoryItem.id }))
  }

  const toggleNPC = (npc: NPC) => {
    setActiveNPC(prev => (prev?.id === npc.id ? null : npc))
  }

  const addChatMessage = (npcId: string, message: ChatMessage) => {
    // Find NPC in GameMemory and update
    const npc = npcs.find(n => n.id === npcId)
    if (npc) {
      const updatedNPC = { ...npc, chatHistory: [...npc.chatHistory, message] }
      updateEntity(updatedNPC, 'npc')
    }
  }

  const moveToLocation = (location: Location) => {
    setCurrentLocation(location)
    setActiveNPC(null)  // Stop talking to NPC when moving
    
    // Mark location as explored
    setExploredLocations(prev => new Set(prev).add(location.id))
  }

  const getLocationAt = (x: number, y: number, region: string): Location | undefined => {
    const { locations } = getEntitiesAt(region, x, y)
    return locations[0] // Assuming one location per coordinate
  }

  const changeRegion = (direction: 'north' | 'south' | 'east' | 'west') => {
    const directionMap = {
      north: { dx: 0, dy: -1 },
      south: { dx: 0, dy: 1 },
      east: { dx: 1, dy: 0 },
      west: { dx: -1, dy: 0 }
    }
    
    const offset = directionMap[direction]
    const targetRegionX = currentRegion.regionX + offset.dx
    const targetRegionY = currentRegion.regionY + offset.dy
    
    // Find the target region
    const targetRegion = allRegions.find(
      r => r.regionX === targetRegionX && r.regionY === targetRegionY
    )
    
    if (!targetRegion) {
      console.warn(`No region found to the ${direction}`)
      return
    }
    
    // Find entry point in new region using GameMemory
    const { locations } = getEntitiesAt(targetRegion.id, 0, 0)
    const entryLocation = locations[0]
    
    if (entryLocation) {
      moveToLocation(entryLocation)
    } else {
      console.warn(`No entry point found in region ${targetRegion.name}`)
    }
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
        selectedEntity,
        setSelectedEntity,
        currentLocation,
        currentRegion,
        allRegions,
        exploredLocations,
        draggedItem,
        startDrag,
        endDrag,
        moveItem,
        swapItems,
        takeItem,
        toggleNPC,
        addChatMessage,
        moveToLocation,
        changeRegion,
        getLocationAt,
        getItemInSlot,
      }}
    >
      {children}
    </GameContext.Provider>
  )
}

