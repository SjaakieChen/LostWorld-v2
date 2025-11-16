import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react'
import type { Item, NPC, DraggedItem, Location, Region, ChatMessage } from '../types'
import type { PlayerStats, PlayerStatus } from '../services/entity-generation/types'
import type { PlayerCharacter } from '../services/game-orchestrator/types'
import type { PlayerUIStateSnapshot } from '../services/save-game'
import { useEntityStorage } from './EntityMemoryStorage'
import { useGameState } from './GameStateContext'
import { pushTurnContext } from '../services/timeline/timeline-service'

// Conditionally import dev dashboard services (only in development)
let cachedHistoryTracker: any = null
let cachedStateBroadcaster: any = null
let trackerPromise: Promise<any> | null = null
let broadcasterPromise: Promise<any> | null = null

const getHistoryTracker = async () => {
  if (!import.meta.env.DEV) return null
  if (cachedHistoryTracker) return cachedHistoryTracker
  if (!trackerPromise) {
    trackerPromise = import('../dev-dashboard/entity-history-tracker').then(module => {
      cachedHistoryTracker = module.entityHistoryTracker
      return cachedHistoryTracker
    })
  }
  return trackerPromise
}

const getStateBroadcaster = async () => {
  if (!import.meta.env.DEV) return null
  if (cachedStateBroadcaster) return cachedStateBroadcaster
  if (!broadcasterPromise) {
    broadcasterPromise = import('../dev-dashboard/state-broadcaster').then(module => {
      cachedStateBroadcaster = module.stateBroadcaster
      return cachedStateBroadcaster
    })
  }
  return broadcasterPromise
}

const getHistoryTrackerSync = () => cachedHistoryTracker
const getStateBroadcasterSync = () => cachedStateBroadcaster

const broadcastFullHistoryForEntity = (
  entityId: string,
  entityType: 'item' | 'npc' | 'location'
) => {
  if (!import.meta.env.DEV) return
  const tracker = getHistoryTrackerSync()
  const broadcaster = getStateBroadcasterSync()
  if (tracker && broadcaster) {
    const historyEntries = tracker.getEntityHistory(entityId)
    broadcaster.broadcastEntityHistory({
      entityId,
      entityType,
      history: historyEntries
    })
  }
}

/**
 * PlayerUIContext - Manages the player's UI state and what they see
 * 
 * This context represents the player's current view of the game world:
 * - What location they're at
 * - What entities they can see (NPCs, items)
 * - What they have in inventory/equipment
 * - What they've discovered (explored locations)
 * - Active interactions (NPC conversations, modals, drag operations)
 * 
 * This is the primary context for LLMs to understand what the player
 * is currently experiencing in the UI.
 */

interface PlayerUIContextType {
  // === PLAYER INVENTORY & EQUIPMENT (What player has) ===
  inventorySlots: Record<string, string | null>  // 12 inventory slots storing item IDs
  equipmentSlots: Record<string, string | null>  // 6 equipment slots storing item IDs
  interactionInputSlots: Record<string, string | null>  // 3 input slots storing item IDs
  interactionOutputSlots: Record<string, string | null>  // 3 output slots storing item IDs
  
  // === VISIBLE ENTITIES (What player sees at current location) ===
  interactableItems: Item[]  // Items visible at current location - from EntityStorage
  npcs: NPC[]  // NPCs visible at current location - from EntityStorage
  
  // === ACTIVE INTERACTIONS ===
  activeNPC: NPC | null  // NPC player is currently talking to
  inspectedItem: Item | null  // Inventory item currently being inspected
  selectedEntity: Item | NPC | Location | null  // Entity selected for modal display
  draggedItem: DraggedItem | null  // Item being dragged and its source
  
  // === PLAYER POSITION (Where player is) ===
  currentLocation: Location  // Player's current location
  currentRegion: Region  // Player's current region
  
  // === PLAYER KNOWLEDGE (What player has discovered) ===
  exploredLocations: Set<string>  // Location IDs the player has visited
  allRegions: Region[]  // All regions available in the game
  
  // === PLAYER CHARACTER ===
  playerStats: PlayerStats  // Dynamic stats from orchestrator
  playerStatus: PlayerStatus  // Health + Energy
  statChangeIndicators: Record<string, number>  // Per-stat delta for current turn
  statusChangeIndicators: { health: number; energy: number }  // Health/Energy deltas for current turn
  
  // === GAME PROGRESSION ===
  currentTurn: number  // Current turn number
  
  // === UI ACTIONS ===
  getStateSnapshot: () => PlayerUIStateSnapshot
  setSelectedEntity: (entity: Item | NPC | Location | null) => void
  inspectItem: (item: Item) => void
  clearInspection: () => void
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
  increasePlayerStat: (statName: string, amount: number) => void
  updatePlayerStatus: (healthDelta: number, energyDelta: number, changeReason: string) => void
  resetChangeIndicators: () => void
  incrementTurn: () => void
}

const PlayerUIContext = createContext<PlayerUIContextType | undefined>(undefined)

export const usePlayerUI = () => {
  const context = useContext(PlayerUIContext)
  if (!context) {
    throw new Error('usePlayerUI must be used within PlayerUIProvider')
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

interface SavedPlayerState {
  inventorySlots: Record<string, string | null>
  equipmentSlots: Record<string, string | null>
  interactionInputSlots: Record<string, string | null>
  interactionOutputSlots: Record<string, string | null>
  currentLocationId: string
  currentRegionId: string
  exploredLocationIds: string[]
  playerStats: PlayerStats
  playerStatus: PlayerStatus
  currentTurn?: number  // Optional for backward compatibility
}

interface PlayerUIProviderProps {
  children: ReactNode
  initialPlayer?: PlayerCharacter
  savedPlayerState?: SavedPlayerState
}

export const PlayerUIProvider = ({ children, initialPlayer, savedPlayerState }: PlayerUIProviderProps) => {
  // EntityStorage hook - provides all game data
  const { getEntitiesAt, updateEntity, getAllItemById, allRegions, getAllLocationById } = useEntityStorage()
  const {
    generatedData,
    setActiveAdvisorLLM,
    setActiveNPCLLM,
    setActiveItemInspectionLLM,
    setPlayerLocationResolver
  } = useGameState()
  const getPlayerMeta = () => {
    const playerSource = generatedData?.player ?? initialPlayer ?? null
    const config = generatedData?.config

    const playerName = playerSource?.name ?? 'Unknown Adventurer'
    const playerDescription = playerSource?.description ?? ''
    const playerBackgroundDescription =
      config?.playerBackgroundDescription ??
      playerSource?.background ??
      playerDescription
    const playerVisualDescription =
      config?.playerVisualDescription ??
      playerBackgroundDescription ??
      playerDescription
    const playerImageUrl = playerSource?.image_url ?? ''

    return {
      playerName,
      playerDescription,
      playerBackgroundDescription,
      playerVisualDescription,
      playerImageUrl
    }
  }
  
  // Preload dev dashboard services in DEV mode
  useEffect(() => {
    if (import.meta.env.DEV) {
      getHistoryTracker()
      getStateBroadcaster()
    }
  }, [])

  // Initialize from saved state or new game
  const parseStartingLocation = () => {
    if (savedPlayerState) {
      // Loading a save: location will be set via useEffect after EntityStorage is ready
      return { region: '', x: 0, y: 0 }
    }
    if (initialPlayer && initialPlayer.startingLocation) {
      const [region, x, y] = initialPlayer.startingLocation.split(':')
      return { region, x: parseInt(x, 10), y: parseInt(y, 10) }
    }
    return { region: 'region_medieval_kingdom_001', x: 0, y: 0 }
  }
  
  const { region: STARTING_REGION, x: STARTING_X, y: STARTING_Y } = parseStartingLocation()
  
  // Get initial current location
  const getInitialLocation = (): Location => {
    if (savedPlayerState && allRegions.length > 0) {
      // Try to find saved location, fallback to first location
      const savedLoc = getAllLocationById(savedPlayerState.currentLocationId)
      if (savedLoc) return savedLoc
    }
    // New game or fallback
    const { locations } = getEntitiesAt(STARTING_REGION, STARTING_X, STARTING_Y)
    return locations[0] || { id: '', name: '', region: STARTING_REGION, x: STARTING_X, y: STARTING_Y, description: '', image_url: '', rarity: 'common' }
  }
  
  const [currentLocation, setCurrentLocation] = useState<Location>(getInitialLocation())
  
  // Calculate current region
  const currentRegion = allRegions.find(r => 
    savedPlayerState ? r.id === savedPlayerState.currentRegionId : r.id === currentLocation.region
  ) || allRegions[0]
  
  // Initialize explored locations
  const getInitialExploredLocations = (): Set<string> => {
    if (savedPlayerState) {
      return new Set(savedPlayerState.exploredLocationIds)
    }
    return new Set([currentLocation.id])
  }
  
  const [exploredLocations, setExploredLocations] = useState<Set<string>>(getInitialExploredLocations())

  // Get entities at current location from EntityStorage
  const { items: interactableItems, npcs } = getEntitiesAt(
    currentLocation.region,
    currentLocation.x,
    currentLocation.y
  )

  // Initialize inventory - from saved state or empty
  const [inventorySlots, setInventorySlots] = useState<Record<string, string | null>>(
    savedPlayerState?.inventorySlots || initializeInventorySlots([])
  )

  // Equipment slots (6 semantic slots) - from saved state or empty
  const [equipmentSlots, setEquipmentSlots] = useState<Record<string, string | null>>(
    savedPlayerState?.equipmentSlots || {
      head: null,
      chest: null,
      legs: null,
      feet: null,
      leftHand: null,
      rightHand: null,
    }
  )

  // Interaction panel input slots (3 semantic slots) - from saved state or empty
  const [interactionInputSlots, setInteractionInputSlots] = useState<Record<string, string | null>>(
    savedPlayerState?.interactionInputSlots || {
      input_slot_1: null,
      input_slot_2: null,
      input_slot_3: null,
    }
  )

  // Interaction panel output slots (3 semantic slots) - from saved state or empty
  const [interactionOutputSlots, setInteractionOutputSlots] = useState<Record<string, string | null>>(
    savedPlayerState?.interactionOutputSlots || {
      output_slot_1: null,
      output_slot_2: null,
      output_slot_3: null,
    }
  )

  // Active NPC conversation
  const [activeNPC, setActiveNPC] = useState<NPC | null>(null)
  const [inspectedItem, setInspectedItem] = useState<Item | null>(null)

  // Selected entity for modal display
  const [selectedEntity, setSelectedEntity] = useState<Item | NPC | Location | null>(null)

  // Drag state
  const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null)

  // Initialize player stats/status from saved state or initial player or placeholders
  const [playerStats, setPlayerStats] = useState<PlayerStats>(
    savedPlayerState?.playerStats || initialPlayer?.stats || {
      'Placeholder 1': {
        value: 50,
        tier: 1,
        tierNames: ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4', 'Tier 5']
      },
      'Placeholder 2': {
        value: 50,
        tier: 1,
        tierNames: ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4', 'Tier 5']
      },
      'Placeholder 3': {
        value: 50,
        tier: 1,
        tierNames: ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4', 'Tier 5']
      },
      'Placeholder 4': {
        value: 50,
        tier: 1,
        tierNames: ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4', 'Tier 5']
      },
      'Placeholder 5': {
        value: 50,
        tier: 1,
        tierNames: ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4', 'Tier 5']
      },
      'Placeholder 6': {
        value: 50,
        tier: 1,
        tierNames: ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4', 'Tier 5']
      }
    }
  )
  
  const [playerStatus, setPlayerStatus] = useState<PlayerStatus>(
    savedPlayerState?.playerStatus || initialPlayer?.status || {
      health: 100,
      maxHealth: 100,
      energy: 100,
      maxEnergy: 100
    }
  )
  const [statChangeIndicators, setStatChangeIndicators] = useState<Record<string, number>>({})
  const [statusChangeIndicators, setStatusChangeIndicators] = useState<{ health: number; energy: number }>({
    health: 0,
    energy: 0
  })

  // Initialize turn count - from saved state or default to 0
  const [currentTurn, setCurrentTurn] = useState<number>(
    savedPlayerState?.currentTurn ?? 0
  )
  const currentTurnRef = useRef(currentTurn)

  useEffect(() => {
    currentTurnRef.current = currentTurn
  }, [currentTurn])

  useEffect(() => {
    const releaseTurnContext = pushTurnContext({
      getCurrentTurn: () => currentTurnRef.current,
      source: 'PlayerUIContext'
    })

    return releaseTurnContext
  }, [])

  // Restore location and region from saved state when EntityStorage is ready
  useEffect(() => {
    if (savedPlayerState && allRegions.length > 0) {
      const savedLocation = getAllLocationById(savedPlayerState.currentLocationId)
      if (savedLocation) {
        setCurrentLocation(savedLocation)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedPlayerState, allRegions.length])

  // Helper to get item from slot ID
  const getItemInSlot = (slotId: string): Item | null => {
    const itemId = inventorySlots[slotId] || equipmentSlots[slotId] || 
                   interactionInputSlots[slotId] || interactionOutputSlots[slotId]
    return itemId ? getAllItemById(itemId) || null : null
  }

  // Get current state snapshot for saving
  const getStateSnapshot = (): PlayerUIStateSnapshot => {
    return {
      inventorySlots,
      equipmentSlots,
      interactionInputSlots,
      interactionOutputSlots,
      currentLocationId: currentLocation.id,
      currentRegionId: currentRegion.id,
      exploredLocationIds: Array.from(exploredLocations),
      playerStats,
      playerStatus,
      currentTurn
    }
  }

  // Increment turn count
  const resetChangeIndicators = useCallback(() => {
    setStatChangeIndicators({})
    setStatusChangeIndicators({ health: 0, energy: 0 })
  }, [])

  const incrementTurn = () => {
    setCurrentTurn(prev => prev + 1)
  }

  const clearInspection = () => {
    setInspectedItem(null)
    setActiveAdvisorLLM()
  }

  const inspectItem = (item: Item) => {
    setInspectedItem(item)
    setActiveNPC(null)
    setActiveItemInspectionLLM()
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

    // SOURCE OF TRUTH: Track player action before updating entity
    if (import.meta.env.DEV) {
      const tracker = getHistoryTrackerSync()
      const broadcaster = getStateBroadcasterSync()
      if (tracker && broadcaster) {
        tracker.recordChange(
          item.id,
          'item',
          item,
          inventoryItem,
          'player_action',
          'item_picked_up'
        )

        broadcaster.broadcastEntityChange({
          entityId: item.id,
          entityType: 'item',
          previousState: item,
          newState: inventoryItem,
          changeSource: 'player_action',
          reason: 'item_picked_up',
          timestamp: Date.now()
        })

        broadcastFullHistoryForEntity(item.id, 'item')
      }
    }

    // Update in memory (moves to inventory coordinates)
    updateEntity(inventoryItem, 'item')

    if (inspectedItem?.id === item.id) {
      setInspectedItem(inventoryItem)
    }
    setActiveAdvisorLLM()

    // Link to inventory slot
    setInventorySlots(prev => ({ ...prev, [emptySlotId]: inventoryItem.id }))
  }

  const toggleNPC = (npc: NPC) => {
    setActiveNPC(prev => {
      const isSameNPC = prev?.id === npc.id
      if (!isSameNPC) {
        clearInspection()
        setActiveNPCLLM(npc.name)
      }
      if (isSameNPC) {
        setActiveAdvisorLLM()
      }
      return isSameNPC ? null : npc
    })
  }

  const addChatMessage = (npcId: string, message: ChatMessage) => {
    // Find NPC in EntityStorage and update
    const npc = npcs.find(n => n.id === npcId)
    if (npc) {
      const updatedNPC = { ...npc, chatHistory: [...npc.chatHistory, message] }
      
      // SOURCE OF TRUTH: Track player action before updating entity
      if (import.meta.env.DEV) {
        const tracker = getHistoryTrackerSync()
        const broadcaster = getStateBroadcasterSync()
        if (tracker && broadcaster) {
          tracker.recordChange(
            npc.id,
            'npc',
            npc,
            updatedNPC,
            'player_action',
            'chat_message_added'
          )

          broadcaster.broadcastEntityChange({
            entityId: npc.id,
            entityType: 'npc',
            previousState: npc,
            newState: updatedNPC,
            changeSource: 'player_action',
            reason: 'chat_message_added',
            timestamp: Date.now()
          })

        broadcastFullHistoryForEntity(npc.id, 'npc')
        }
      }
      
      updateEntity(updatedNPC, 'npc')
    }
  }

  const moveToLocation = (location: Location) => {
    setCurrentLocation(location)
    setActiveNPC(null)  // Stop talking to NPC when moving
    clearInspection()
    setActiveAdvisorLLM()
    
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
    
    // Find entry point in new region using EntityStorage
    const { locations } = getEntitiesAt(targetRegion.id, 0, 0)
    const entryLocation = locations[0]
    
    if (entryLocation) {
      moveToLocation(entryLocation)
    } else {
      console.warn(`No entry point found in region ${targetRegion.name}`)
    }
  }

  const increasePlayerStat = (statName: string, amount: number) => {
    setPlayerStats(prev => {
      const currentStat = prev[statName]
      if (!currentStat) return prev
      
      let newValue = currentStat.value + amount
      let newTier = currentStat.tier
      
      // Handle tier leveling (max tier 5)
      while (newValue >= 100 && newTier < 5) {
        newValue -= 100
        newTier += 1
      }
      
      // Handle tier downleveling (min tier 1)
      while (newValue < 0 && newTier > 1) {
        newValue += 100
        newTier -= 1
      }
      
      // Cap at tier 5, value 100
      if (newTier >= 5) {
        newTier = 5
        newValue = Math.min(newValue, 100)
      }
      
      // Cap at tier 1, value 0
      if (newTier <= 1) {
        newTier = 1
        newValue = Math.max(newValue, 0)
      }
      
      return {
        ...prev,
        [statName]: {
          ...currentStat,
          value: newValue,
          tier: newTier
        }
      }
    })

    setStatChangeIndicators(prev => ({
      ...prev,
      [statName]: (prev[statName] ?? 0) + amount
    }))
  }

  const updatePlayerStatus = (healthDelta: number, energyDelta: number, changeReason: string) => {
    setPlayerStatus(prev => {
      const newHealth = Math.max(0, Math.min(prev.maxHealth, prev.health + healthDelta))
      const newEnergy = Math.max(0, Math.min(prev.maxEnergy, prev.energy + energyDelta))
      const appliedHealthDelta = newHealth - prev.health
      const appliedEnergyDelta = newEnergy - prev.energy
      
      console.log(`Status update: health ${prev.health} -> ${newHealth} (${healthDelta > 0 ? '+' : ''}${healthDelta}), energy ${prev.energy} -> ${newEnergy} (${energyDelta > 0 ? '+' : ''}${energyDelta}) - ${changeReason}`)

      setStatusChangeIndicators(prevIndicators => ({
        health: prevIndicators.health + appliedHealthDelta,
        energy: prevIndicators.energy + appliedEnergyDelta
      }))
      
      return {
        ...prev,
        health: newHealth,
        energy: newEnergy
      }
    })
  }

  // Register a resolver for the current player location with GameStateContext
  useEffect(() => {
    setPlayerLocationResolver(() =>
      currentLocation
        ? {
            region: currentLocation.region,
            x: currentLocation.x,
            y: currentLocation.y
          }
        : null
    )

    return () => {
      setPlayerLocationResolver(null)
    }
  }, [currentLocation, setPlayerLocationResolver])

  // Listen for sync requests from dashboard and respond immediately
  useEffect(() => {
    if (!import.meta.env.DEV) return

    let channel: BroadcastChannel | null = null
    try {
      channel = new BroadcastChannel('lostworld-dev-dashboard')
    } catch (error) {
      console.warn('[Dev Dashboard] Failed to create BroadcastChannel for sync listener in PlayerUIContext:', error)
      return
    }

    const handleSyncRequest = (event: MessageEvent) => {
      const message = event.data
      if (message?.type === 'SYNC_REQUEST') {
        const broadcaster = getStateBroadcasterSync()
        if (broadcaster) {
          // Immediately broadcast full player UI state
          broadcaster.broadcastPlayerUI({
            currentLocation,
            currentRegion,
            inventorySlots,
            equipmentSlots,
            playerStats,
            playerStatus,
            exploredLocationsCount: exploredLocations.size,
            activeNPC,
            ...getPlayerMeta()
          })
          console.log('[Dev Dashboard] Sync request received, player UI state broadcast sent')
        }
      }
    }

    channel.onmessage = handleSyncRequest

    return () => {
      channel?.close()
    }
  }, [currentLocation, currentRegion, inventorySlots, equipmentSlots, playerStats, playerStatus, exploredLocations, activeNPC, generatedData])

  // Listen for dashboard commands (e.g., location changes)
  useEffect(() => {
    if (!import.meta.env.DEV) return

    let channel: BroadcastChannel | null = null
    try {
      channel = new BroadcastChannel('lostworld-dev-dashboard')
    } catch (error) {
      console.warn('[Dev Dashboard] Failed to create BroadcastChannel for command listener in PlayerUIContext:', error)
      return
    }

    const handleDashboardCommand = (event: MessageEvent) => {
      const message = event.data
      if (message?.type === 'DASHBOARD_COMMAND') {
        if (message.data?.commandType === 'CHANGE_LOCATION') {
          const locationId = message.data.locationId
          const targetLocation = getAllLocationById(locationId)
          
          if (targetLocation) {
            moveToLocation(targetLocation)
            console.log('[Dev Dashboard] Location changed via dashboard command to:', targetLocation.name || targetLocation.id)
          } else {
            console.warn('[Dev Dashboard] Location not found for ID:', locationId)
          }
        }
      }
    }

    channel.onmessage = handleDashboardCommand

    return () => {
      channel?.close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Functions are stable, no need to include in dependencies

  // Broadcast player UI state when it changes (only in DEV)
  useEffect(() => {
    if (!import.meta.env.DEV) return

    const broadcaster = getStateBroadcasterSync()
    if (!broadcaster) return

    broadcaster.broadcastPlayerUI({
      currentLocation,
      currentRegion,
      inventorySlots,
      equipmentSlots,
      playerStats,
      playerStatus,
      exploredLocationsCount: exploredLocations.size,
      activeNPC,
      ...getPlayerMeta()
    })
  }, [currentLocation, currentRegion, inventorySlots, equipmentSlots, playerStats, playerStatus, exploredLocations, activeNPC, generatedData])

  return (
    <PlayerUIContext.Provider
      value={{
        inventorySlots,
        equipmentSlots,
        interactionInputSlots,
        interactionOutputSlots,
        interactableItems,
        npcs,
        activeNPC,
        inspectedItem,
        selectedEntity,
        setSelectedEntity,
        currentLocation,
        currentRegion,
        allRegions,
        exploredLocations,
        playerStats,
        playerStatus,
        statChangeIndicators,
        statusChangeIndicators,
        currentTurn,
        draggedItem,
        getStateSnapshot,
        inspectItem,
        clearInspection,
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
        increasePlayerStat,
        updatePlayerStatus,
        resetChangeIndicators,
        incrementTurn,
      }}
    >
      {children}
    </PlayerUIContext.Provider>
  )
}

