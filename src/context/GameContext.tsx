import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Item, NPC, DraggedItem, Location, Region, ChatMessage } from '../types'
import { 
  STARTING_INVENTORY_ITEMS, 
  WORLD_ITEMS, 
  GAME_NPCS, 
  GAME_LOCATIONS, 
  GAME_REGIONS,
  STARTING_LOCATION_ID 
} from '../data'

interface GameContextType {
  // Items state - ALL use semantic Record<string, Item | null> for consistency
  inventorySlots: Record<string, Item | null>
  equipmentSlots: Record<string, Item | null>
  interactionInputSlots: Record<string, Item | null>
  interactionOutputSlots: Record<string, Item | null>
  interactableItems: Item[]  // Items in the world (not yet picked up) - filtered by location
  
  // NPC state
  npcs: NPC[]  // All NPCs - filtered by current location
  activeNPC: NPC | null  // Store full NPC object for semantic access
  
  // Spatial state
  currentLocation: Location
  currentRegion: Region
  allLocations: Location[]
  allRegions: Region[]
  allWorldItems: Item[]  // All items in world (unfiltered)
  allNPCs: NPC[]  // All NPCs (unfiltered)
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
  // Spatial state - world map and locations
  const [allRegions] = useState<Region[]>(GAME_REGIONS)
  const [allLocations] = useState<Location[]>(GAME_LOCATIONS)
  const [currentLocation, setCurrentLocation] = useState<Location>(
    GAME_LOCATIONS.find(loc => loc.id === STARTING_LOCATION_ID) || GAME_LOCATIONS[0]
  )
  const currentRegion = allRegions.find(r => r.id === currentLocation.region) || allRegions[0]
  
  // Exploration tracking - start with current location explored
  const [exploredLocations, setExploredLocations] = useState<Set<string>>(
    new Set([STARTING_LOCATION_ID])
  )

  // All world entities (unfiltered)
  const [allWorldItems, setAllWorldItems] = useState<Item[]>(WORLD_ITEMS)
  const [allNPCs, setAllNPCs] = useState<NPC[]>(GAME_NPCS)

  // Filtered entities - only show those at current location
  const interactableItems = allWorldItems.filter(
    item => item.x === currentLocation.x && item.y === currentLocation.y && item.region === currentLocation.region
  )
  const npcs = allNPCs.filter(
    npc => npc.x === currentLocation.x && npc.y === currentLocation.y && npc.region === currentLocation.region
  )

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

  // Active NPC conversation
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

    // Update item to be in inventory region
    const inventoryItem: Item = {
      ...item,
      x: 0,
      y: 0,
      region: 'inventory'
    }

    // Add to inventory
    setInventorySlots(prev => ({ ...prev, [emptySlotId]: inventoryItem }))

    // Remove from world items
    setAllWorldItems(prev => prev.filter(i => i.id !== item.id))
  }

  const toggleNPC = (npc: NPC) => {
    setActiveNPC(prev => (prev?.id === npc.id ? null : npc))
  }

  const addChatMessage = (npcId: string, message: ChatMessage) => {
    setAllNPCs(prev => prev.map(npc => 
      npc.id === npcId
        ? { ...npc, chatHistory: [...npc.chatHistory, message] }
        : npc
    ))
  }

  const moveToLocation = (location: Location) => {
    setCurrentLocation(location)
    setActiveNPC(null)  // Stop talking to NPC when moving
    
    // Mark location as explored
    setExploredLocations(prev => new Set(prev).add(location.id))
  }

  const getLocationAt = (x: number, y: number, region: string): Location | undefined => {
    return allLocations.find(loc => loc.x === x && loc.y === y && loc.region === region)
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
    
    // Find or create entry point in new region (default to 0,0 for now)
    const entryLocation = allLocations.find(
      loc => loc.region === targetRegion.id && loc.x === 0 && loc.y === 0
    )
    
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
        currentLocation,
        currentRegion,
        allLocations,
        allRegions,
        allWorldItems,
        allNPCs,
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
      }}
    >
      {children}
    </GameContext.Provider>
  )
}

