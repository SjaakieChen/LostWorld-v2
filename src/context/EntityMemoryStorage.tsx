import { createContext, useContext, useState, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import type { Item, NPC, Location, Region } from '../types'

// Conditionally import dev dashboard services (only in development)
// Using cached lazy initialization pattern
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

// Synchronous getters that return cached values (for use in synchronous code)
const getHistoryTrackerSync = () => cachedHistoryTracker
const getStateBroadcasterSync = () => cachedStateBroadcaster

type EntityType = 'item' | 'npc' | 'location'

interface CoordinateEntities {
  locations: Location[]
  npcs: NPC[]
  items: Item[]
}

interface EntityStorageState {
  entityMap: Record<string, CoordinateEntities>  // Spatial index
  allItems: Item[]       // Complete registry with own_attributes
  allLocations: Location[]  // Complete registry
  allNPCs: NPC[]        // Complete registry
  allRegions: Region[]     // Complete region registry
}

interface EntityStorageContextType extends EntityStorageState {
  getEntitiesAt: (region: string, x: number, y: number) => CoordinateEntities
  getStateSnapshot: () => { allItems: Item[], allLocations: Location[], allNPCs: NPC[], allRegions: Region[] }
  addEntity: (entity: Item | NPC | Location, type: EntityType) => void
  removeEntity: (entityId: string, type: EntityType) => void
  updateEntity: (entity: Item | NPC | Location, type: EntityType) => void
  getAllItemById: (itemId: string) => Item | undefined
  getAllLocationById: (locationId: string) => Location | undefined
  getAllNPCById: (npcId: string) => NPC | undefined
  getAllRegionById: (regionId: string) => Region | undefined
  getRegionByCoordinates: (regionX: number, regionY: number) => Region | undefined
  addRegion: (region: Region) => void
  updateRegion: (region: Region) => void
}

export type { EntityStorageContextType }

const EntityStorageContext = createContext<EntityStorageContextType | undefined>(undefined)

export const useEntityStorage = () => {
  const context = useContext(EntityStorageContext)
  if (!context) throw new Error('useEntityStorage must be used within EntityStorageProvider')
  return context
}

interface EntityStorageProviderProps {
  children: ReactNode
  initialData?: {
    regions: Region[]
    locations: Location[]
    npcs: NPC[]
    items: Item[]
  }
}

export const EntityStorageProvider = ({ children, initialData }: EntityStorageProviderProps) => {
  const makeKey = (region: string, x: number, y: number) => `${region}:${x}:${y}`
  
  // Preload dev dashboard services in DEV mode (async, doesn't block)
  useEffect(() => {
    if (import.meta.env.DEV) {
      getHistoryTracker()
      getStateBroadcaster()
    }
  }, [])
  
  // Initialize from static data or provided initial data
  const initializeStorage = (): EntityStorageState => {
    const entityMap: Record<string, CoordinateEntities> = {}
    
    // Use initialData from orchestrator
    const allItems: Item[] = initialData?.items || []
    const allLocations: Location[] = initialData?.locations || []
    const allNPCs: NPC[] = initialData?.npcs || []
    const allRegions: Region[] = initialData?.regions || []
    
    // Index locations
    allLocations.forEach(location => {
      const key = makeKey(location.region, location.x, location.y)
      if (!entityMap[key]) entityMap[key] = { locations: [], npcs: [], items: [] }
      entityMap[key].locations.push(location)
    })
    
    // Index NPCs
    allNPCs.forEach(npc => {
      const key = makeKey(npc.region, npc.x, npc.y)
      if (!entityMap[key]) entityMap[key] = { locations: [], npcs: [], items: [] }
      entityMap[key].npcs.push(npc)
    })
    
    // Index items by region coordinates (only non-inventory items)
    allItems.forEach(item => {
      const key = makeKey(item.region, item.x, item.y)
      if (!entityMap[key]) entityMap[key] = { locations: [], npcs: [], items: [] }
      entityMap[key].items.push(item)
    })
    
    return { entityMap, allItems, allLocations, allNPCs, allRegions }
  }
  
  const [storage, setStorage] = useState<EntityStorageState>(initializeStorage)
  
  // Track if initial broadcast has happened
  const hasBroadcastedInitial = useRef(false)
  const retryAttempts = useRef(0)
  const MAX_RETRIES = 20 // 2 seconds at 100ms intervals
  
  // Broadcast initial entity storage state immediately on mount when entities exist
  useEffect(() => {
    if (!import.meta.env.DEV) return
    if (hasBroadcastedInitial.current) return
    
    const hasEntities = storage.allItems.length > 0 || 
                        storage.allLocations.length > 0 || 
                        storage.allNPCs.length > 0 || 
                        storage.allRegions.length > 0
    
    if (!hasEntities) return
    
    const tryBroadcast = () => {
      const broadcaster = getStateBroadcasterSync()
      if (broadcaster) {
        broadcaster.broadcastEntityStorage({
          allItems: storage.allItems,
          allLocations: storage.allLocations,
          allNPCs: storage.allNPCs,
          allRegions: storage.allRegions
        })
        hasBroadcastedInitial.current = true
        console.log('[Dev Dashboard] Initial entity storage broadcast sent')
      } else if (retryAttempts.current < MAX_RETRIES) {
        retryAttempts.current++
        setTimeout(tryBroadcast, 100)
      } else {
        console.warn('[Dev Dashboard] Broadcaster not ready after 2 seconds, initial broadcast skipped')
      }
    }
    
    tryBroadcast()
  }, []) // Run once on mount
  
  const getEntitiesAt = (region: string, x: number, y: number): CoordinateEntities => {
    const key = makeKey(region, x, y)
    return storage.entityMap[key] || { locations: [], npcs: [], items: [] }
  }

  const getStateSnapshot = () => {
    return {
      allItems: storage.allItems,
      allLocations: storage.allLocations,
      allNPCs: storage.allNPCs,
      allRegions: storage.allRegions
    }
  }
  
  const addEntity = (entity: Item | NPC | Location, type: EntityType) => {
    // SOURCE OF TRUTH: Update state first
    setStorage(prev => {
      const key = makeKey(entity.region, entity.x, entity.y)
      const newMap = { ...prev.entityMap }
      if (!newMap[key]) newMap[key] = { locations: [], npcs: [], items: [] }
      
      // Update complete registries
      const newAllItems = type === 'item' ? [...prev.allItems, entity as Item] : prev.allItems
      const newAllLocations = type === 'location' ? [...prev.allLocations, entity as Location] : prev.allLocations
      const newAllNPCs = type === 'npc' ? [...prev.allNPCs, entity as NPC] : prev.allNPCs
      
      // Update spatial index
      const newStorage = {
        entityMap: {
          ...newMap,
          [key]: {
            ...newMap[key],
            [type === 'item' ? 'items' : type === 'npc' ? 'npcs' : 'locations']: [
              ...newMap[key][type === 'item' ? 'items' : type === 'npc' ? 'npcs' : 'locations'],
              entity
            ]
          }
        },
        allItems: newAllItems,
        allLocations: newAllLocations,
        allNPCs: newAllNPCs,
        allRegions: prev.allRegions
      }

      // BROADCAST: After state update, record history and broadcast (only in DEV)
      if (import.meta.env.DEV) {
        const tracker = getHistoryTrackerSync()
        const broadcaster = getStateBroadcasterSync()
        if (tracker && broadcaster) {
          // Record history (new entity, so previousState is null)
          tracker.recordChange(
            entity.id,
            type,
            null,
            entity,
            'system',
            'entity_added'
          )

          // Broadcast entity change
          broadcaster.broadcastEntityChange({
          entityId: entity.id,
          entityType: type,
          previousState: null,
          newState: entity,
            changeSource: 'system',
            reason: 'entity_added',
            timestamp: Date.now()
          })
        }
      }

      return newStorage
    })
  }
  
  const removeEntity = (entityId: string, type: EntityType) => {
    // SOURCE OF TRUTH: Get current state before removal
    let previousEntityState: Item | NPC | Location | undefined = undefined
    if (import.meta.env.DEV) {
      // Find entity before removal
      if (type === 'item') {
        previousEntityState = storage.allItems.find(e => e.id === entityId)
      } else if (type === 'location') {
        previousEntityState = storage.allLocations.find(e => e.id === entityId)
      } else if (type === 'npc') {
        previousEntityState = storage.allNPCs.find(e => e.id === entityId)
      }
    }

    // SOURCE OF TRUTH: Update state first
    setStorage(prev => {
      const newMap = { ...prev.entityMap }
      const pluralType = type === 'item' ? 'items' : type === 'npc' ? 'npcs' : 'locations'
      
      // Find and remove from coordinate index
      Object.keys(newMap).forEach(key => {
        newMap[key] = {
          ...newMap[key],
          [pluralType]: newMap[key][pluralType].filter(e => e.id !== entityId)
        }
      })
      
      // Remove from complete registries
      const newAllItems = type === 'item' 
        ? prev.allItems.filter(item => item.id !== entityId)
        : prev.allItems
      const newAllLocations = type === 'location' 
        ? prev.allLocations.filter(loc => loc.id !== entityId)
        : prev.allLocations
      const newAllNPCs = type === 'npc' 
        ? prev.allNPCs.filter(npc => npc.id !== entityId)
        : prev.allNPCs
      
      const newStorage = { 
        entityMap: newMap, 
        allItems: newAllItems,
        allLocations: newAllLocations,
        allNPCs: newAllNPCs,
        allRegions: prev.allRegions
      }

      // BROADCAST: After state update, record history and broadcast (only in DEV)
      if (import.meta.env.DEV && previousEntityState) {
        const tracker = getHistoryTrackerSync()
        const broadcaster = getStateBroadcasterSync()
        if (tracker && broadcaster) {
          // Record history (removed entity, so newState is null)
          tracker.recordChange(
            entityId,
            type,
            previousEntityState,
            null as any, // Entity was removed
            'system',
            'entity_removed'
          )

          // Broadcast entity change
          broadcaster.broadcastEntityChange({
          entityId,
          entityType: type,
          previousState: previousEntityState,
          newState: null,
            changeSource: 'system',
            reason: 'entity_removed',
            timestamp: Date.now()
          })
        }
      }

      return newStorage
    })
  }
  
  const updateEntity = (entity: Item | NPC | Location, type: EntityType) => {
    // SOURCE OF TRUTH: Get current entity state before update
    let previousEntityState: Item | NPC | Location | undefined = undefined
    if (import.meta.env.DEV) {
      // Find entity before update
      if (type === 'item') {
        previousEntityState = storage.allItems.find(e => e.id === entity.id)
      } else if (type === 'location') {
        previousEntityState = storage.allLocations.find(e => e.id === entity.id)
      } else if (type === 'npc') {
        previousEntityState = storage.allNPCs.find(e => e.id === entity.id)
      }
    }

    // SOURCE OF TRUTH: Update state first (atomic: remove old, add new in one operation)
    setStorage(prev => {
      // Remove from old location (if entity moved)
      const oldKey = previousEntityState 
        ? makeKey(previousEntityState.region, previousEntityState.x, previousEntityState.y)
        : makeKey(entity.region, entity.x, entity.y)
      
      const newMap = { ...prev.entityMap }
      const pluralType = type === 'item' ? 'items' : type === 'npc' ? 'npcs' : 'locations'
      
      // Remove from old location
      if (newMap[oldKey]) {
        newMap[oldKey] = {
          ...newMap[oldKey],
          [pluralType]: newMap[oldKey][pluralType].filter(e => e.id !== entity.id)
        }
      }
      
      // Add to new location
      const newKey = makeKey(entity.region, entity.x, entity.y)
      if (!newMap[newKey]) newMap[newKey] = { locations: [], npcs: [], items: [] }
      
      // Update complete registries (replace entity in array)
      const newAllItems = type === 'item' 
        ? prev.allItems.map(item => item.id === entity.id ? entity as Item : item)
        : prev.allItems
      const newAllLocations = type === 'location'
        ? prev.allLocations.map(loc => loc.id === entity.id ? entity as Location : loc)
        : prev.allLocations
      const newAllNPCs = type === 'npc'
        ? prev.allNPCs.map(npc => npc.id === entity.id ? entity as NPC : npc)
        : prev.allNPCs
      
      // Ensure entity is in spatial index
      if (type === 'item') {
        const items = newMap[newKey].items as Item[]
        if (!items.some(e => e.id === entity.id)) {
          newMap[newKey].items = [...items, entity as Item]
        } else {
          newMap[newKey].items = items.map(e => e.id === entity.id ? entity as Item : e)
        }
      } else if (type === 'npc') {
        const npcs = newMap[newKey].npcs as NPC[]
        if (!npcs.some(e => e.id === entity.id)) {
          newMap[newKey].npcs = [...npcs, entity as NPC]
        } else {
          newMap[newKey].npcs = npcs.map(e => e.id === entity.id ? entity as NPC : e)
        }
      } else if (type === 'location') {
        const locations = newMap[newKey].locations as Location[]
        if (!locations.some(e => e.id === entity.id)) {
          newMap[newKey].locations = [...locations, entity as Location]
        } else {
          newMap[newKey].locations = locations.map(e => e.id === entity.id ? entity as Location : e)
        }
      }

      const newStorage = {
        entityMap: newMap,
        allItems: newAllItems,
        allLocations: newAllLocations,
        allNPCs: newAllNPCs,
        allRegions: prev.allRegions
      }

      // BROADCAST: After state update, record history and broadcast (only in DEV)
      if (import.meta.env.DEV && previousEntityState) {
        const tracker = getHistoryTrackerSync()
        const broadcaster = getStateBroadcasterSync()
        if (tracker && broadcaster) {
          // Record history (entity updated)
          tracker.recordChange(
            entity.id,
            type,
            previousEntityState,
            entity,
            'system',
            'entity_updated'
          )

          // Broadcast entity change
          broadcaster.broadcastEntityChange({
            entityId: entity.id,
            entityType: type,
            previousState: previousEntityState,
            newState: entity,
            changeSource: 'system',
            reason: 'entity_updated',
            timestamp: Date.now()
          })
        }
      }

      return newStorage
    })
  }
  
  const getAllItemById = (itemId: string) => {
    return storage.allItems.find(item => item.id === itemId)
  }
  
  const getAllLocationById = (locationId: string) => {
    return storage.allLocations.find(location => location.id === locationId)
  }
  
  const getAllNPCById = (npcId: string) => {
    return storage.allNPCs.find(npc => npc.id === npcId)
  }
  
  const getAllRegionById = (regionId: string) => {
    return storage.allRegions.find(region => region.id === regionId)
  }
  
  const getRegionByCoordinates = (regionX: number, regionY: number) => {
    return storage.allRegions.find(
      region => region.regionX === regionX && region.regionY === regionY
    )
  }
  
  const addRegion = (region: Region) => {
    setStorage(prev => ({
      ...prev,
      allRegions: [...prev.allRegions, region]
    }))
  }
  
  const updateRegion = (region: Region) => {
    // SOURCE OF TRUTH: Get current state before update
    let previousRegionState: Region | undefined = undefined
    if (import.meta.env.DEV) {
      previousRegionState = storage.allRegions.find(r => r.id === region.id)
    }

    // SOURCE OF TRUTH: Update state first
    setStorage(prev => {
      const newStorage = {
        ...prev,
        allRegions: prev.allRegions.map(r => 
          r.id === region.id ? region : r
        )
      }

      // BROADCAST: After state update, record history and broadcast (only in DEV)
      if (import.meta.env.DEV && previousRegionState) {
        const tracker = getHistoryTrackerSync()
        const broadcaster = getStateBroadcasterSync()
        if (tracker && broadcaster) {
          tracker.recordChange(
            region.id,
            'region',
            previousRegionState,
            region,
            'system',
            'region_updated'
          )

          broadcaster.broadcastEntityChange({
            entityId: region.id,
            entityType: 'region',
            previousState: previousRegionState,
            newState: region,
            changeSource: 'system',
            reason: 'region_updated',
            timestamp: Date.now()
          })
        }
      }

      return newStorage
    })
  }

  // Listen for sync requests from dashboard and respond immediately
  useEffect(() => {
    if (!import.meta.env.DEV) return

    let channel: BroadcastChannel | null = null
    try {
      channel = new BroadcastChannel('lostworld-dev-dashboard')
    } catch (error) {
      console.warn('[Dev Dashboard] Failed to create BroadcastChannel for sync listener:', error)
      return
    }

    const handleSyncRequest = (event: MessageEvent) => {
      const message = event.data
      if (message?.type === 'SYNC_REQUEST') {
        const broadcaster = getStateBroadcasterSync()
        if (broadcaster) {
          // Immediately broadcast full entity storage state
          broadcaster.broadcastEntityStorage({
            allItems: storage.allItems,
            allLocations: storage.allLocations,
            allNPCs: storage.allNPCs,
            allRegions: storage.allRegions
          })
          console.log('[Dev Dashboard] Sync request received, entity storage broadcast sent')
        }
      }
    }

    channel.onmessage = handleSyncRequest

    return () => {
      channel?.close()
    }
  }, [storage]) // Re-subscribe when storage changes to capture latest state

  // Broadcast full entity storage state periodically (debounced to every 1 second for faster sync)
  // This handles ongoing changes after initial broadcast
  useEffect(() => {
    if (!import.meta.env.DEV) return

    const broadcaster = getStateBroadcasterSync()
    if (!broadcaster) return

    // Only broadcast if initial broadcast has already happened (to avoid duplicate)
    // or if we're past the initial mount phase
    if (!hasBroadcastedInitial.current) return

    const timeoutId = setTimeout(() => {
      broadcaster.broadcastEntityStorage({
        allItems: storage.allItems,
        allLocations: storage.allLocations,
        allNPCs: storage.allNPCs,
        allRegions: storage.allRegions
      })
    }, 1000) // Reduced from 2000ms to 1000ms for faster sync

    return () => clearTimeout(timeoutId)
  }, [storage.allItems.length, storage.allLocations.length, storage.allNPCs.length, storage.allRegions.length])
  
  return (
    <EntityStorageContext.Provider value={{
      ...storage,
      getEntitiesAt,
      getStateSnapshot,
      addEntity,
      removeEntity,
      updateEntity,
      getAllItemById,
      getAllLocationById,
      getAllNPCById,
      getAllRegionById,
      getRegionByCoordinates,
      addRegion,
      updateRegion
    }}>
      {children}
    </EntityStorageContext.Provider>
  )
}

